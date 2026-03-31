import type { LobbyGameActionMessage } from '../../../../shared/contracts/realtime-lobby'
import type {
    JeopardyDeclaration,
    RealtimeJeopardyPublicSession,
    RealtimeJeopardyQuestionId,
    RealtimeJeopardySessionInternal,
    RealtimeJeopardySessionState,
    RealtimeJeopardyState,
    RealtimeJeopardyWinner
} from '../../../../shared/contracts/jeopardy'
import { shuffle } from '../../../../util/array'
import {
    getAnswers as getJeopardyAnswers,
    getFinalThemes,
    getNonFinalThemes,
    getQuestionById as getJeopardyQuestionById,
    getQuestionScenarioById,
    getRoundQuestionViewData,
    getRoundQuestions,
    getRoundThemeNames,
    getRoundsCount,
    isFinalRound
} from '../../jeopardy/pack'
import type { FinalizeLobbySessionInput } from '../../lobby-sessions/store'
import type { LobbyScheduler } from '../../scheduler/LobbyScheduler'
import { nowIso } from '../../lobby/time'
import type { GameStartResult, JeopardyActionResult, ScheduledTaskResult } from './operations'
import type { LobbyScheduledTaskPayload, StoredJeopardyGame, StoredJeopardySession, StoredLobbyMember, StoredLobbyState } from './internal-types'

const JEOPARDY_PACK_PREVIEW_DURATION_MS = 10_000
const JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS = 2_000
const JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS = 2_000
const JEOPARDY_PICK_QUESTION_DELAY_MS = 1_000
const JEOPARDY_CONTENT_DEFAULT_DURATION_MS = 5_000
const JEOPARDY_ANSWER_REQUEST_DURATION_MS = 5_000
const JEOPARDY_ANSWER_GIVING_DURATION_MS = 10_000
const JEOPARDY_ANSWER_VERIFYING_DURATION_MS = 10_000
const JEOPARDY_ANSWER_COOLDOWN_MS = 2_000

function getPhaseTimingWindow(nowMs: number, totalMs: number, remainingMs: number) {
    const boundedRemainingMs = Math.max(0, Math.min(remainingMs, totalMs))
    const startedAtMs = nowMs - (totalMs - boundedRemainingMs)

    return {
        endsAt: new Date(startedAtMs + totalMs).toISOString(),
        startedAt: new Date(startedAtMs).toISOString(),
        timeLeft: totalMs > 0 ? (boundedRemainingMs / totalMs) * 100 : 0
    }
}

type JeopardyDeps = {
    createGameActionMessage: (payload: LobbyGameActionMessage['payload']) => LobbyGameActionMessage
    getConnectedSocketsCount: (userId: string) => number
    persistFinalizedLobbySession: (session: FinalizeLobbySessionInput | null | undefined) => Promise<void>
    scheduler: LobbyScheduler<LobbyScheduledTaskPayload>
}

function withLobbySessionId(internal: RealtimeJeopardySessionInternal): RealtimeJeopardySessionInternal & { lobbySessionId?: string } {
    return internal as RealtimeJeopardySessionInternal & { lobbySessionId?: string }
}

export function createEmptyJeopardySessionInternal(): RealtimeJeopardySessionInternal {
    return {
        answeredQuestions: [],
        currentAnsweringPlayerId: null,
        currentRoundId: 0,
        finalAnswers: {},
        finalBets: {},
        pickerId: null
    }
}

export function createEmptyJeopardySession(): StoredJeopardySession {
    return {
        frame: {
            id: 'none'
        },
        internal: createEmptyJeopardySessionInternal(),
        isPaused: false,
        meta: {
            answerRequestRemainingMs: null,
            currentQuestionFlow: null,
            mediaElapsedTimeMs: 0,
            mediaStartedAt: null,
            pausedTasks: []
        }
    }
}

export class JeopardyLobbyFeature {
    constructor(private readonly deps: JeopardyDeps) {}

    toPublicSession(session: StoredJeopardySession): RealtimeJeopardyPublicSession {
        const { internal: _internal, meta: _meta, ...publicSession } = session

        if (publicSession.frame.id === 'question-content') {
            return {
                ...publicSession,
                frame: {
                    ...publicSession.frame,
                    elapsedMediaTimeMs: this.getMediaElapsedTimeMs(session)
                }
            }
        }

        return publicSession
    }

    toInternalView(internal: RealtimeJeopardySessionInternal): RealtimeJeopardySessionInternal {
        const { lobbySessionId: _lobbySessionId, ...sessionInternal } = withLobbySessionId(internal)

        return sessionInternal
    }

    getMaster(state: StoredLobbyState): StoredLobbyMember | null {
        return state.members.find(member => member.id === state.creatorUserId && member.role === 'player') || null
    }

    getContestants(state: StoredLobbyState): StoredLobbyMember[] {
        return state.members.filter(member => member.role === 'player' && member.id !== state.creatorUserId)
    }

    getActiveLobbySessionId(state: StoredLobbyState): string | null {
        const activeSession = state.game.name === 'Jeopardy' ? state.game.session : null

        if (!activeSession) {
            return null
        }

        return withLobbySessionId(activeSession.internal).lobbySessionId || null
    }

    setLobbySessionId(state: StoredLobbyState, lobbySessionId: string): void {
        const session = this.getSession(state)

        if (!session) {
            return
        }

        withLobbySessionId(session.internal).lobbySessionId = lobbySessionId
    }

    async startGame(state: StoredLobbyState, userId: string): Promise<GameStartResult> {
        if (state.game.name !== 'Jeopardy') {
            return {
                success: false,
                message: 'This room does not run Jeopardy',
                code: 'invalid_game'
            }
        }

        if (state.creatorUserId !== userId) {
            return {
                success: false,
                message: 'Only the Jeopardy master can start the game',
                code: 'forbidden'
            }
        }

        if (state.game.session) {
            return {
                success: false,
                message: 'A Jeopardy session is already in progress',
                code: 'game_in_progress'
            }
        }

        const players = state.members.filter(member => member.role === 'player')
        const contestants = this.getContestants(state)

        if (players.length < 2 || contestants.length < 1) {
            return {
                success: false,
                message: 'Jeopardy requires the master and at least 1 contestant',
                code: 'invalid_player_count'
            }
        }

        if (!players.every(player => player.ready === true)) {
            return {
                success: false,
                message: 'Run the ready check and wait for all players to confirm',
                code: 'players_not_ready'
            }
        }

        const sessionId = crypto.randomUUID()
        const startedAt = nowIso()

        state.game.session = createEmptyJeopardySession()
        this.setLobbySessionId(state, sessionId)

        await this.beginPackPreview(state, sessionId)
        state.members.forEach(member => {
            member.ready = null
        })
        state.readyCheck = {
            participants: [],
            status: 'idle',
            updatedAt: nowIso(),
            votes: {}
        }
        return {
            success: true,
            startedSession: {
                gameName: state.game.name,
                id: sessionId,
                initiatedByUserId: userId,
                startedAt
            },
            stateChanged: true
        }
    }

    async handleAction(state: StoredLobbyState, userId: string, actionName: string, actionPayload: unknown): Promise<JeopardyActionResult> {
        const game = this.getGame(state)
        const session = this.getSession(state)
        const actor = state.members.find(member => member.id === userId && member.role === 'player')
        const isMaster = userId === state.creatorUserId

        if (!game || !session || !actor) {
            return {
                code: 'not_a_player',
                message: 'Only players can use Jeopardy controls',
                success: false
            }
        }

        if (session.isPaused && !['$Pause', '$Resume'].includes(actionName)) {
            return {
                code: 'session_paused',
                message: 'Jeopardy is paused',
                success: false
            }
        }

        switch (actionName) {
            case '$Pause':
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can pause the game',
                        success: false
                    }
                }

                return this.pauseSession(state)
            case '$Resume':
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can resume the game',
                        success: false
                    }
                }

                return this.resumeSession(state)
            case '$PickQuestion': {
                if (session.frame.id !== 'question-board') {
                    return {
                        code: 'invalid_frame',
                        message: 'You can only pick a question from the question board',
                        success: false
                    }
                }

                const payload = actionPayload as { questionId?: RealtimeJeopardyQuestionId } | null

                if (!payload?.questionId) {
                    return {
                        code: 'invalid_payload',
                        message: 'Question id is required',
                        success: false
                    }
                }

                if (!isMaster && session.frame.pickerId !== userId) {
                    return {
                        code: 'not_picker',
                        message: 'Only the current picker can choose a question',
                        success: false
                    }
                }

                if (session.frame.pickedQuestion) {
                    return {
                        code: 'already_picked',
                        message: `Question ${session.frame.pickedQuestion} is already being opened`,
                        success: false
                    }
                }

                if (!getJeopardyQuestionById(game.packDeclaration, payload.questionId)) {
                    return {
                        code: 'question_not_found',
                        message: 'Question not found',
                        success: false
                    }
                }

                if (session.internal.answeredQuestions.includes(payload.questionId)) {
                    return {
                        code: 'question_answered',
                        message: 'This question has already been answered',
                        success: false
                    }
                }

                this.updateFrame(state, {
                    ...session.frame,
                    pickedQuestion: payload.questionId
                })

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.scheduleTask(
                        sessionId,
                        'pick-question.complete',
                        {
                            questionId: payload.questionId,
                            sessionId,
                            type: 'jeopardy.pick-question.complete'
                        },
                        JEOPARDY_PICK_QUESTION_DELAY_MS
                    )
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$AnswerRequest': {
                if (session.frame.id !== 'question-content') {
                    return {
                        code: 'invalid_frame',
                        message: 'There is no active question to answer',
                        success: false
                    }
                }

                if (actor.id === state.creatorUserId) {
                    return {
                        code: 'master_cannot_answer',
                        message: 'The Jeopardy master cannot answer questions',
                        success: false
                    }
                }

                if (session.frame.playersOnCooldown.includes(userId) || session.frame.playersWhoAnswered.includes(userId)) {
                    return {
                        code: 'player_unavailable',
                        message: 'You already answered this question or are on cooldown',
                        success: false
                    }
                }

                if (session.frame.answeringStatus !== 'allowed' || session.frame.answeringPlayerId) {
                    const sessionId = this.getActiveLobbySessionId(state)

                    if (sessionId) {
                        await this.scheduleTask(
                            sessionId,
                            `cooldown.${userId}`,
                            {
                                sessionId,
                                type: 'jeopardy.cooldown.complete',
                                userId
                            },
                            JEOPARDY_ANSWER_COOLDOWN_MS
                        )
                    }

                    this.updateFrame(state, {
                        ...session.frame,
                        playersOnCooldown: [...session.frame.playersOnCooldown, userId]
                    })

                    return {
                        action: this.createSuccessfulGameAction(
                            {
                                id: actor.id,
                                type: 'player'
                            },
                            '$AnswerRequest',
                            null,
                            {
                                isPlayerOnCooldown: true
                            }
                        ),
                        stateChanged: true,
                        success: true
                    }
                }

                const remainingMs = session.frame.answerRequestEndsAt
                    ? Math.max(new Date(session.frame.answerRequestEndsAt).getTime() - Date.now(), 0)
                    : JEOPARDY_ANSWER_REQUEST_DURATION_MS

                session.meta.answerRequestRemainingMs = remainingMs

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'answer-request.complete')
                    await this.scheduleTask(
                        sessionId,
                        'answer-giving.complete',
                        {
                            sessionId,
                            type: 'jeopardy.answer-giving.complete'
                        },
                        JEOPARDY_ANSWER_GIVING_DURATION_MS
                    )
                }

                const phaseTiming = getPhaseTimingWindow(Date.now(), JEOPARDY_ANSWER_GIVING_DURATION_MS, JEOPARDY_ANSWER_GIVING_DURATION_MS)

                this.updateFrame(state, {
                    ...session.frame,
                    answeringPlayerId: userId,
                    answeringStatus: 'answering',
                    answerRequestStartedAt: null,
                    answerRequestEndsAt: null,
                    answerRequestTimeLeft: null,
                    answerGivingStartedAt: phaseTiming.startedAt,
                    answerGivingEndsAt: phaseTiming.endsAt,
                    answerGivingTimeLeft: phaseTiming.timeLeft,
                    playersWhoAnswered: [...session.frame.playersWhoAnswered, userId]
                })

                return {
                    action: this.createSuccessfulGameAction(
                        {
                            id: actor.id,
                            type: 'player'
                        },
                        '$AnswerRequest',
                        null,
                        {
                            isPlayerOnCooldown: false
                        }
                    ),
                    stateChanged: true,
                    success: true
                }
            }
            case '$GiveAnswer': {
                if (session.frame.id !== 'question-content' || session.frame.answeringStatus !== 'answering' || session.frame.answeringPlayerId !== userId) {
                    return {
                        code: 'invalid_answer_turn',
                        message: 'It is not your turn to answer',
                        success: false
                    }
                }

                const payload = actionPayload as { text?: string } | null

                this.updateInternal(state, {
                    currentAnsweringPlayerAnswerText: payload?.text,
                    currentAnsweringPlayerId: userId
                })

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'answer-giving.complete')
                }

                await this.beginAnswerVerifying(state)

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$RateAnswer': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can rate answers',
                        success: false
                    }
                }

                if (
                    session.frame.id !== 'question-content' ||
                    session.frame.answeringStatus !== 'answer-verifying' ||
                    !session.internal.currentAnsweringPlayerId
                ) {
                    return {
                        code: 'invalid_frame',
                        message: 'There is no answer to rate',
                        success: false
                    }
                }

                const payload = actionPayload as { rating?: 'approved' | 'declined' } | null

                if (!payload?.rating) {
                    return {
                        code: 'invalid_payload',
                        message: 'Rating is required',
                        success: false
                    }
                }

                const answeringPlayer = state.members.find(member => member.id === session.internal.currentAnsweringPlayerId && member.role === 'player')
                const question = getJeopardyQuestionById(game.packDeclaration, session.frame.questionId)

                if (!answeringPlayer || !question) {
                    return {
                        code: 'invalid_answer_state',
                        message: 'Answer state is invalid',
                        success: false
                    }
                }

                const delta = parseInt(question._attributes.price, 10)

                answeringPlayer.playerScore += payload.rating === 'approved' ? delta : -delta

                if (payload.rating === 'approved') {
                    this.updateInternal(state, {
                        pickerId: answeringPlayer.id
                    })
                }

                this.updateFrame(state, {
                    ...session.frame,
                    result: payload.rating
                })

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'answer-verifying.complete')
                }

                this.updateInternal(state, {
                    correctAnswers: null,
                    currentAnsweringPlayerAnswerText: null,
                    currentAnsweringPlayerId: null,
                    incorrectAnswers: null
                })

                await this.continueQuestionAfterAnswerResolution(state, payload.rating === 'approved')

                return {
                    action: this.createSuccessfulGameAction(
                        {
                            id: actor.id,
                            type: 'player'
                        },
                        '$RateAnswer',
                        {
                            rating: payload.rating
                        }
                    ),
                    stateChanged: true,
                    success: true
                }
            }
            case '$SetScore': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can set scores',
                        success: false
                    }
                }

                const payload = actionPayload as { playerID?: string; score?: number | string } | null
                const nextScore = Number(payload?.score)

                if (!payload?.playerID || !Number.isFinite(nextScore)) {
                    return {
                        code: 'invalid_payload',
                        message: 'Player id and score are required',
                        success: false
                    }
                }

                const player = state.members.find(member => member.id === payload.playerID && member.role === 'player')

                if (!player) {
                    return {
                        code: 'player_not_found',
                        message: `Player with ID ${payload.playerID} not found`,
                        success: false
                    }
                }

                player.playerScore = nextScore

                return {
                    action: this.createSuccessfulGameAction(
                        {
                            id: actor.id,
                            type: 'player'
                        },
                        '$SetScore',
                        {
                            playerID: payload.playerID,
                            score: nextScore
                        }
                    ),
                    stateChanged: true,
                    success: true
                }
            }
            case '$SkipVote': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can skip phases',
                        success: false
                    }
                }

                const sessionId = this.getActiveLobbySessionId(state)

                if (!sessionId) {
                    return {
                        code: 'game_not_started',
                        message: 'There is no active Jeopardy session',
                        success: false
                    }
                }

                switch (session.frame.id) {
                    case 'pack-preview':
                        await this.cancelTask(sessionId, 'pack-preview.complete')
                        await this.beginRoundPreview(state, session.internal.currentRoundId)
                        return { stateChanged: true, success: true }
                    case 'rounds-preview':
                        await this.cancelTask(sessionId, 'round-preview.complete')
                        await this.deps.scheduler.cancelByPrefix(this.getTaskKey(sessionId, 'round-preview.theme.'))

                        if (isFinalRound(game.packDeclaration, session.internal.currentRoundId)) {
                            await this.showFinalRoundBoard(state)
                        } else {
                            this.showQuestionBoard(state, session.internal.currentRoundId)
                        }

                        return { stateChanged: true, success: true }
                    case 'question-content':
                        if (session.frame.answeringStatus === 'allowed') {
                            await this.cancelTask(sessionId, 'answer-request.complete')
                            await this.handleAnswerRequestCompleteTask(state, sessionId)
                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'answering') {
                            await this.cancelTask(sessionId, 'answer-giving.complete')
                            this.updateInternal(state, {
                                currentAnsweringPlayerAnswerText: null,
                                currentAnsweringPlayerId: session.frame.answeringPlayerId
                            })
                            await this.beginAnswerVerifying(state)
                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'answer-verifying') {
                            await this.cancelTask(sessionId, 'answer-verifying.complete')
                            const currentAnsweringPlayerId = session.internal.currentAnsweringPlayerId
                            const question = getJeopardyQuestionById(game.packDeclaration, session.frame.questionId)

                            if (currentAnsweringPlayerId && question) {
                                const answeringPlayer = state.members.find(member => member.id === currentAnsweringPlayerId && member.role === 'player')

                                if (answeringPlayer) {
                                    answeringPlayer.playerScore -= parseInt(question._attributes.price, 10)
                                }
                            }

                            this.updateInternal(state, {
                                correctAnswers: null,
                                currentAnsweringPlayerAnswerText: null,
                                currentAnsweringPlayerId: null,
                                incorrectAnswers: null
                            })
                            await this.continueQuestionAfterAnswerResolution(state, false)
                            return { stateChanged: true, success: true }
                        }

                        await this.cancelTask(sessionId, 'question.atom.complete').catch(() => null)

                        await this.showNextQuestionAtom(state)
                        return { stateChanged: true, success: true }
                    default:
                        return {
                            code: 'invalid_frame',
                            message: 'This phase cannot be skipped',
                            success: false
                        }
                }
            }
            case '$SkipFinalTheme': {
                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'skipping') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final theme skipping is not active',
                        success: false
                    }
                }

                if (!isMaster && session.frame.skipperId !== userId) {
                    return {
                        code: 'not_skipper',
                        message: 'It is not your turn to skip a theme',
                        success: false
                    }
                }

                const payload = actionPayload as { themeIndex?: number } | null
                const themeIndex = payload?.themeIndex

                if (typeof themeIndex !== 'number') {
                    return {
                        code: 'invalid_payload',
                        message: 'Theme index is required',
                        success: false
                    }
                }

                const theme = session.frame.themes[themeIndex]

                if (!theme) {
                    return {
                        code: 'invalid_theme',
                        message: 'Theme not found',
                        success: false
                    }
                }

                if (theme.skipped) {
                    return {
                        code: 'already_skipped',
                        message: 'This theme is already skipped',
                        success: false
                    }
                }

                const remainingThemes = session.frame.themes.filter(item => !item.skipped).length

                if (remainingThemes <= 1) {
                    return {
                        code: 'cannot_skip_last_theme',
                        message: 'You cannot skip the last remaining theme',
                        success: false
                    }
                }

                const contestants = this.getContestants(state)
                const currentSkipperIndex = contestants.findIndex(player => player.id === userId)
                const nextSkipper = contestants.length ? contestants[(currentSkipperIndex + 1 + contestants.length) % contestants.length] : null

                theme.skipped = true

                this.updateFrame(state, {
                    ...session.frame,
                    skipperId: nextSkipper?.id || null,
                    themes: [...session.frame.themes]
                })

                const action = this.createSuccessfulGameAction(
                    {
                        id: actor.id,
                        type: 'player'
                    },
                    '$SkipFinalTheme',
                    {
                        themeIndex
                    }
                )

                if (session.frame.themes.filter(item => !item.skipped).length === 1) {
                    await this.beginFinalRoundBetting(state)
                }

                return {
                    action,
                    stateChanged: true,
                    success: true
                }
            }
            case '$MakeFinalBet': {
                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'betting') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final betting is not active',
                        success: false
                    }
                }

                if (actor.id === state.creatorUserId || actor.playerScore <= 0) {
                    return {
                        code: 'invalid_bettor',
                        message: 'Only contestants with a positive score can bet',
                        success: false
                    }
                }

                if (session.frame.playersThatMadeBet.includes(userId)) {
                    return {
                        code: 'already_bet',
                        message: 'You already made your bet',
                        success: false
                    }
                }

                const payload = actionPayload as { value?: number } | null
                const value = payload?.value

                if (typeof value !== 'number' || value < 1 || value > actor.playerScore) {
                    return {
                        code: 'invalid_bet',
                        message: 'Bet must be within your score range',
                        success: false
                    }
                }

                session.internal.finalBets[userId] = value

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatMadeBet: [...session.frame.playersThatMadeBet, userId]
                })

                const eligibleBetters = this.getContestants(state).filter(player => player.playerScore > 0)

                if (session.frame.playersThatMadeBet.length + 1 >= eligibleBetters.length) {
                    await this.beginFinalQuestionAnswering(state)
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$GiveFinalAnswer': {
                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'answering') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final answers are not open right now',
                        success: false
                    }
                }

                if (actor.id === state.creatorUserId || actor.playerScore <= 0) {
                    return {
                        code: 'invalid_answerer',
                        message: 'Only contestants with a positive score can answer',
                        success: false
                    }
                }

                if (session.frame.playersThatAnswered.includes(userId)) {
                    return {
                        code: 'already_answered',
                        message: 'You already submitted your final answer',
                        success: false
                    }
                }

                const payload = actionPayload as { answer?: string } | null

                session.internal.finalAnswers[userId] = {
                    value: payload?.answer || ''
                }

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatAnswered: [...session.frame.playersThatAnswered, userId]
                })

                const eligibleAnswerers = this.getContestants(state).filter(player => player.playerScore > 0)

                if (session.frame.playersThatAnswered.length + 1 >= eligibleAnswerers.length) {
                    this.beginFinalQuestionVerifying(state)
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$RateFinalAnswer': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can rate final answers',
                        success: false
                    }
                }

                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'answer-verifying') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final answer verification is not active',
                        success: false
                    }
                }

                const payload = actionPayload as { answeringPlayerId?: string; rate?: 'approved' | 'declined' } | null
                const answeringPlayerId = payload?.answeringPlayerId
                const rate = payload?.rate

                if (!answeringPlayerId || !rate) {
                    return {
                        code: 'invalid_payload',
                        message: 'Final answer rating is incomplete',
                        success: false
                    }
                }

                const answer = session.internal.finalAnswers[answeringPlayerId]
                const answeringPlayer = state.members.find(member => member.id === answeringPlayerId && member.role === 'player')

                if (!answer || !answeringPlayer) {
                    return {
                        code: 'answer_not_found',
                        message: 'Final answer not found',
                        success: false
                    }
                }

                answer.rate = rate
                answeringPlayer.playerScore +=
                    rate === 'approved' ? session.internal.finalBets[answeringPlayerId] || 0 : -(session.internal.finalBets[answeringPlayerId] || 0)

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$ShowFinalScores':
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can show final scores',
                        success: false
                    }
                }

                await this.showFinalScores(state)

                return {
                    stateChanged: true,
                    success: true
                }
            case '$MediaEnded':
                if (session.frame.id !== 'question-content' || (session.frame.type !== 'video' && session.frame.type !== 'voice')) {
                    return {
                        code: 'invalid_media_state',
                        message: 'There is no active Jeopardy media atom to finish',
                        success: false
                    }
                }

                session.meta.mediaElapsedTimeMs = 0
                session.meta.mediaStartedAt = null
                await this.showNextQuestionAtom(state)

                return {
                    stateChanged: true,
                    success: true
                }
            default:
                return {
                    code: 'unsupported_action',
                    message: `Unsupported Jeopardy action: ${actionName}`,
                    success: false
                }
        }
    }

    async handleTask(state: StoredLobbyState, task: LobbyScheduledTaskPayload): Promise<ScheduledTaskResult> {
        switch (task.type) {
            case 'jeopardy.pack-preview.complete':
                return this.handlePackPreviewCompleteTask(state, task.sessionId)
            case 'jeopardy.round-preview.theme':
                return this.handleRoundPreviewThemeTask(state, task.sessionId, task.roundId, task.themeIndex)
            case 'jeopardy.round-preview.complete':
                return this.handleRoundPreviewCompleteTask(state, task.sessionId, task.roundId)
            case 'jeopardy.pick-question.complete':
                return this.handlePickQuestionCompleteTask(state, task.sessionId, task.questionId)
            case 'jeopardy.question.atom.complete':
                return this.handleQuestionAtomCompleteTask(state, task.sessionId)
            case 'jeopardy.answer-request.complete':
                return this.handleAnswerRequestCompleteTask(state, task.sessionId)
            case 'jeopardy.answer-giving.complete':
                return this.handleAnswerGivingCompleteTask(state, task.sessionId)
            case 'jeopardy.answer-verifying.complete':
                return this.handleAnswerVerifyingCompleteTask(state, task.sessionId)
            case 'jeopardy.cooldown.complete':
                return this.handleCooldownCompleteTask(state, task.sessionId, task.userId)
            default:
                return {
                    stateChanged: false
                }
        }
    }

    async handlePlayerRemoved(state: StoredLobbyState, removalReason: 'player_kicked' | 'player_left'): Promise<void> {
        if (state.game.name !== 'Jeopardy' || !state.game.session) {
            return
        }

        const sessionId = this.getActiveLobbySessionId(state)

        if (sessionId) {
            await this.cancelSessionTasks(sessionId)
        }

        await this.deps.persistFinalizedLobbySession(this.createAbandonedLobbySessionRecord(state, removalReason))
        state.game.session = null
    }

    createCompletedLobbySessionRecord(state: StoredLobbyState): FinalizeLobbySessionInput | null {
        if (state.game.name !== 'Jeopardy' || !state.game.session) {
            return null
        }

        const sessionId = this.getActiveLobbySessionId(state)

        if (!sessionId) {
            return null
        }

        const winner =
            state.members
                .filter(member => member.role === 'player')
                .reduce(
                    (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                    null as StoredLobbyMember | null
                ) || null

        return {
            endedAt: nowIso(),
            id: sessionId,
            resultSummary: {
                answeredQuestions: [...state.game.session.internal.answeredQuestions],
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        id: member.id,
                        playerIsMaster: member.isCreator,
                        playerScore: member.playerScore,
                        userNickname: member.userNickname
                    }))
            },
            status: 'completed',
            winnerNickname: winner?.userNickname || null,
            winnerUserId: winner?.id || null
        }
    }

    createAbandonedLobbySessionRecord(state: StoredLobbyState, reason: string): FinalizeLobbySessionInput | null {
        if (state.game.name !== 'Jeopardy') {
            return null
        }

        const sessionId = this.getActiveLobbySessionId(state)

        if (!state.game.session || !sessionId) {
            return null
        }

        return {
            endedAt: nowIso(),
            id: sessionId,
            resultSummary: {
                answeredQuestions: [...state.game.session.internal.answeredQuestions],
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        id: member.id,
                        playerIsMaster: member.isCreator,
                        playerScore: member.playerScore,
                        userNickname: member.userNickname
                    })),
                reason
            },
            status: 'abandoned'
        }
    }

    private getMediaElapsedTimeMs(session: StoredJeopardySession): number | undefined {
        if (session.frame.id !== 'question-content' || (session.frame.type !== 'video' && session.frame.type !== 'voice')) {
            return undefined
        }

        const runningElapsedMs = session.meta.mediaStartedAt ? Date.now() - new Date(session.meta.mediaStartedAt).getTime() : 0

        return session.meta.mediaElapsedTimeMs + Math.max(runningElapsedMs, 0)
    }

    private toWinner(member: StoredLobbyMember): RealtimeJeopardyWinner {
        return {
            id: member.id,
            playerIsMaster: member.isCreator,
            playerScore: member.playerScore,
            userAvatarUrl: member.userAvatarUrl,
            userColor: member.userColor,
            userIsOnline: this.deps.getConnectedSocketsCount(member.id) > 0,
            userNickname: member.userNickname
        }
    }

    private getGame(state: StoredLobbyState): StoredJeopardyGame | null {
        return state.game.name === 'Jeopardy' ? state.game : null
    }

    private getSession(state: StoredLobbyState): StoredJeopardySession | null {
        return state.game.name === 'Jeopardy' ? state.game.session : null
    }

    private createSuccessfulGameAction(actor: { id: string; type: 'game' | 'player' }, actionName: string, actionPayload: unknown, actionResult?: unknown) {
        return this.deps.createGameActionMessage({
            actor,
            actionName,
            actionPayload,
            actionResult: {
                success: true,
                ...(actionResult && typeof actionResult === 'object' ? actionResult : {})
            }
        })
    }

    private getSessionTaskPrefix(sessionId: string): string {
        return `jeopardy:${sessionId}:`
    }

    private getTaskKey(sessionId: string, suffix: string): string {
        return `${this.getSessionTaskPrefix(sessionId)}${suffix}`
    }

    private async scheduleTask(sessionId: string, suffix: string, payload: LobbyScheduledTaskPayload, delayMs: number): Promise<void> {
        await this.deps.scheduler.schedule({
            key: this.getTaskKey(sessionId, suffix),
            payload,
            scheduledAt: Date.now() + Math.max(delayMs, 0)
        })
    }

    private async cancelTask(sessionId: string, suffix: string): Promise<void> {
        await this.deps.scheduler.cancel(this.getTaskKey(sessionId, suffix))
    }

    private async cancelSessionTasks(sessionId: string): Promise<void> {
        await this.deps.scheduler.cancelByPrefix(this.getSessionTaskPrefix(sessionId))
    }

    private updateInternal(state: StoredLobbyState, patch: Partial<RealtimeJeopardySessionInternal>): void {
        const session = this.getSession(state)

        if (!session) {
            return
        }

        session.internal = {
            ...session.internal,
            ...patch
        }
    }

    private updateFrame(state: StoredLobbyState, frame: RealtimeJeopardyState.Frame): void {
        const session = this.getSession(state)

        if (!session) {
            return
        }

        session.frame = frame
    }

    private async beginPackPreview(state: StoredLobbyState, sessionId: string): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session) {
            return
        }

        session.internal = createEmptyJeopardySessionInternal()
        withLobbySessionId(session.internal).lobbySessionId = sessionId
        session.isPaused = false
        session.meta.answerRequestRemainingMs = null
        session.meta.currentQuestionFlow = null
        session.meta.mediaElapsedTimeMs = 0
        session.meta.mediaStartedAt = null
        session.meta.pausedTasks = []
        session.frame = {
            id: 'pack-preview',
            packName: game.packName,
            author: game.packAuthor,
            dateCreated: game.packDateCreated,
            themes: shuffle([...getNonFinalThemes(game.packDeclaration)])
        }

        await this.scheduleTask(sessionId, 'pack-preview.complete', { sessionId, type: 'jeopardy.pack-preview.complete' }, JEOPARDY_PACK_PREVIEW_DURATION_MS)
    }

    private async beginRoundPreview(state: StoredLobbyState, roundId: number): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session) {
            return
        }

        const round = getRoundThemeNames(game.packDeclaration, roundId)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!round || !sessionId) {
            return
        }

        session.frame = {
            id: 'rounds-preview',
            isRoundName: true,
            text: round.roundName
        }

        await this.deps.scheduler.cancelByPrefix(this.getTaskKey(sessionId, 'round-preview.theme.'))
        await this.cancelTask(sessionId, 'round-preview.complete').catch(() => null)

        if (!round.themeNames.length) {
            await this.scheduleTask(
                sessionId,
                'round-preview.complete',
                {
                    roundId,
                    sessionId,
                    type: 'jeopardy.round-preview.complete'
                },
                JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS
            )
            return
        }

        await this.scheduleTask(
            sessionId,
            'round-preview.theme.0',
            {
                roundId,
                sessionId,
                themeIndex: 0,
                type: 'jeopardy.round-preview.theme'
            },
            JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS
        )
    }

    private showQuestionBoard(state: StoredLobbyState, roundId: number): void {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session) {
            return
        }

        const pickerId = session.internal.pickerId || state.creatorUserId
        const themes = getRoundQuestionViewData(game.packDeclaration, roundId)

        if (!themes) {
            return
        }

        this.updateFrame(state, {
            id: 'question-board',
            pickerId,
            roundId,
            themes: themes.map(theme => ({
                ...theme,
                question: theme.question.map(question => ({
                    ...question,
                    isAnswered: session.internal.answeredQuestions.includes(question.questionId)
                }))
            }))
        })
    }

    private async beginQuestion(state: StoredLobbyState, questionId: RealtimeJeopardyQuestionId): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session) {
            return
        }

        const scenario = getQuestionScenarioById(game.packDeclaration, questionId)

        if (!scenario) {
            return
        }

        session.meta.currentQuestionFlow = {
            afterAtoms: scenario[1],
            beforeAtoms: scenario[0],
            questionId,
            shownAtomIndex: -1,
            stage: 'before'
        }
        session.meta.answerRequestRemainingMs = null

        await this.showNextQuestionAtom(state)
    }

    private async showNextQuestionAtom(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)

        if (!session || !session.meta.currentQuestionFlow) {
            return
        }

        const flow = session.meta.currentQuestionFlow
        const atoms = flow.stage === 'before' ? flow.beforeAtoms : flow.afterAtoms
        const nextIndex = flow.shownAtomIndex + 1

        if (nextIndex >= atoms.length) {
            if (flow.stage === 'before') {
                await this.beginAnswerRequest(state, JEOPARDY_ANSWER_REQUEST_DURATION_MS)
                return
            }

            await this.finalizeQuestion(state)
            return
        }

        flow.shownAtomIndex = nextIndex
        await this.showQuestionAtom(state, flow.questionId, atoms[nextIndex], flow.stage === 'before')
    }

    private async showQuestionAtom(
        state: StoredLobbyState,
        questionId: RealtimeJeopardyQuestionId,
        atom: JeopardyDeclaration.QuestionScenarioContentAtom,
        beforeMarker: boolean
    ): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!session || !sessionId) {
            return
        }

        const previousPlayersOnCooldown = session.frame.id === 'question-content' ? [...session.frame.playersOnCooldown] : ([] as string[])
        const previousPlayersWhoAnswered = session.frame.id === 'question-content' ? [...session.frame.playersWhoAnswered] : ([] as string[])
        const type = '_attributes' in atom ? atom._attributes.type : 'text'

        if (beforeMarker) {
            this.updateInternal(state, {
                answerIsApproved: null,
                correctAnswers: null,
                currentAnsweringPlayerAnswerText: null,
                currentAnsweringPlayerId: null,
                incorrectAnswers: null
            })
        }

        session.meta.mediaElapsedTimeMs = 0
        session.meta.mediaStartedAt = type === 'video' || type === 'voice' ? nowIso() : null

        this.updateFrame(state, {
            questionId,
            id: 'question-content',
            type,
            content: atom._text,
            answeringStatus: beforeMarker ? 'too-early' : 'too-late',
            answerRequestTimeLeft: null,
            answerGivingTimeLeft: null,
            answerVerifyingTimeLeft: null,
            playersOnCooldown: previousPlayersOnCooldown,
            playersWhoAnswered: previousPlayersWhoAnswered,
            answeringPlayerId: null,
            skipVoted: [],
            result: undefined,
            mediaStartedAt: session.meta.mediaStartedAt,
            elapsedMediaTimeMs: this.getMediaElapsedTimeMs(session)
        })

        if (type === 'video' || type === 'voice') {
            return
        }

        await this.scheduleTask(
            sessionId,
            'question.atom.complete',
            {
                sessionId,
                type: 'jeopardy.question.atom.complete'
            },
            JEOPARDY_CONTENT_DEFAULT_DURATION_MS
        )
    }

    private async beginAnswerRequest(state: StoredLobbyState, durationMs: number): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!session || !sessionId || session.frame.id !== 'question-content') {
            return
        }

        const remainingMs = Math.max(0, Math.min(durationMs, JEOPARDY_ANSWER_REQUEST_DURATION_MS))
        const phaseTiming = getPhaseTimingWindow(Date.now(), JEOPARDY_ANSWER_REQUEST_DURATION_MS, remainingMs)

        session.meta.answerRequestRemainingMs = remainingMs

        this.updateFrame(state, {
            ...session.frame,
            answeringPlayerId: null,
            answeringStatus: 'allowed',
            answerRequestStartedAt: phaseTiming.startedAt,
            answerRequestEndsAt: phaseTiming.endsAt,
            answerRequestTimeLeft: phaseTiming.timeLeft,
            answerGivingStartedAt: null,
            answerGivingEndsAt: null,
            answerGivingTimeLeft: null,
            answerVerifyingStartedAt: null,
            answerVerifyingEndsAt: null,
            answerVerifyingTimeLeft: null,
            result: undefined
        })

        await this.scheduleTask(
            sessionId,
            'answer-request.complete',
            {
                sessionId,
                type: 'jeopardy.answer-request.complete'
            },
            remainingMs
        )
    }

    private async beginAnswerVerifying(state: StoredLobbyState): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!game || !session || !sessionId || session.frame.id !== 'question-content') {
            return
        }

        const answers = getJeopardyAnswers(game.packDeclaration, session.frame.questionId)

        if (!answers) {
            return
        }

        this.updateInternal(state, {
            correctAnswers: answers[0],
            incorrectAnswers: answers[1]
        })

        const phaseTiming = getPhaseTimingWindow(Date.now(), JEOPARDY_ANSWER_VERIFYING_DURATION_MS, JEOPARDY_ANSWER_VERIFYING_DURATION_MS)

        this.updateFrame(state, {
            ...session.frame,
            answeringPlayerId: null,
            answeringStatus: 'answer-verifying',
            answerGivingStartedAt: null,
            answerGivingEndsAt: null,
            answerGivingTimeLeft: null,
            answerRequestStartedAt: null,
            answerRequestEndsAt: null,
            answerRequestTimeLeft: null,
            answerVerifyingStartedAt: phaseTiming.startedAt,
            answerVerifyingEndsAt: phaseTiming.endsAt,
            answerVerifyingTimeLeft: phaseTiming.timeLeft
        })

        await this.scheduleTask(
            sessionId,
            'answer-verifying.complete',
            {
                sessionId,
                type: 'jeopardy.answer-verifying.complete'
            },
            JEOPARDY_ANSWER_VERIFYING_DURATION_MS
        )
    }

    private async continueQuestionAfterAnswerResolution(state: StoredLobbyState, approved: boolean): Promise<void> {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'question-content') {
            return
        }

        if (!approved && (session.meta.answerRequestRemainingMs || 0) > 0) {
            await this.beginAnswerRequest(state, session.meta.answerRequestRemainingMs || 0)
            return
        }

        session.meta.answerRequestRemainingMs = null

        if (session.meta.currentQuestionFlow) {
            session.meta.currentQuestionFlow.stage = 'after'
            session.meta.currentQuestionFlow.shownAtomIndex = -1
        }

        await this.showNextQuestionAtom(state)
    }

    private async finalizeQuestion(state: StoredLobbyState): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session || !session.meta.currentQuestionFlow) {
            return
        }

        const questionId = session.meta.currentQuestionFlow.questionId
        const answeredQuestions = session.internal.answeredQuestions.includes(questionId)
            ? session.internal.answeredQuestions
            : [...session.internal.answeredQuestions, questionId]

        session.meta.currentQuestionFlow = null
        session.meta.answerRequestRemainingMs = null
        session.meta.mediaElapsedTimeMs = 0
        session.meta.mediaStartedAt = null

        this.updateInternal(state, {
            answeredQuestions
        })

        const roundId = session.internal.currentRoundId
        const roundQuestions = getRoundQuestions(game.packDeclaration, roundId) || []
        const roundCompleted = roundQuestions.every(id => answeredQuestions.includes(id))

        if (!roundCompleted) {
            this.showQuestionBoard(state, roundId)
            return
        }

        const nextRoundId = roundId + 1

        if (nextRoundId > getRoundsCount(game.packDeclaration) - 1) {
            await this.showFinalScores(state)
            return
        }

        this.updateInternal(state, {
            currentRoundId: nextRoundId
        })

        if (isFinalRound(game.packDeclaration, nextRoundId)) {
            if (this.getContestants(state).some(player => player.playerScore > 0)) {
                await this.beginRoundPreview(state, nextRoundId)
            } else {
                await this.showFinalScores(state)
            }

            return
        }

        await this.beginRoundPreview(state, nextRoundId)
    }

    private async showFinalRoundBoard(state: StoredLobbyState): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session) {
            return
        }

        this.updateFrame(state, {
            id: 'final-round-board',
            themes: getFinalThemes(game.packDeclaration).map(name => ({
                name,
                skipped: false
            })),
            skipperId: session.internal.pickerId,
            playersThatAnswered: [],
            playersThatMadeBet: [],
            status: 'skipping'
        })
    }

    private async beginFinalRoundBetting(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'final-round-board') {
            return
        }

        this.updateFrame(state, {
            ...session.frame,
            status: 'betting'
        })
    }

    private async beginFinalQuestionAnswering(state: StoredLobbyState): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session || session.frame.id !== 'final-round-board') {
            return
        }

        const themeIndex = session.frame.themes.findIndex(theme => !theme.skipped)
        const finalRoundIndex = getRoundsCount(game.packDeclaration) - 1
        const questionId = `${finalRoundIndex}-${themeIndex}-0` as RealtimeJeopardyQuestionId
        const scenario = getQuestionScenarioById(game.packDeclaration, questionId)
        const answers = getJeopardyAnswers(game.packDeclaration, questionId)

        if (!scenario || !answers) {
            return
        }

        this.updateInternal(state, {
            correctAnswers: answers[0],
            incorrectAnswers: answers[1]
        })

        this.updateFrame(state, {
            ...session.frame,
            skipperId: null,
            status: 'answering',
            questionAtoms: scenario[0].map(atom => ({
                content: atom._text,
                type: '_attributes' in atom ? atom._attributes.type : 'text'
            }))
        })
    }

    private beginFinalQuestionVerifying(state: StoredLobbyState): void {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'final-round-board') {
            return
        }

        this.updateFrame(state, {
            ...session.frame,
            status: 'answer-verifying'
        })
    }

    private async showFinalScores(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)

        if (!session) {
            return
        }

        const winner =
            state.members
                .filter(member => member.role === 'player')
                .reduce(
                    (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                    null as StoredLobbyMember | null
                ) ||
            state.members.find(member => member.role === 'player') ||
            state.members[0]

        if (!winner) {
            return
        }

        this.updateFrame(state, {
            id: 'final-score',
            winner: this.toWinner(winner)
        })

        await this.deps.persistFinalizedLobbySession(this.createCompletedLobbySessionRecord(state))
    }

    private async pauseSession(state: StoredLobbyState): Promise<JeopardyActionResult> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!session || !sessionId) {
            return {
                code: 'game_not_started',
                message: 'There is no active Jeopardy session',
                success: false
            }
        }

        if (session.isPaused) {
            return {
                code: 'already_paused',
                message: 'Jeopardy is already paused',
                success: false
            }
        }

        const nowMs = Date.now()
        const tasks = (await this.deps.scheduler.list()).filter(task => task.key.startsWith(this.getSessionTaskPrefix(sessionId)))

        session.meta.pausedTasks = tasks.map(task => ({
            key: task.key,
            payload: task.payload,
            remainingMs: Math.max(task.scheduledAt - nowMs, 0)
        }))

        await this.cancelSessionTasks(sessionId)

        if (session.frame.id === 'question-content' && (session.frame.type === 'video' || session.frame.type === 'voice') && session.meta.mediaStartedAt) {
            session.meta.mediaElapsedTimeMs += nowMs - new Date(session.meta.mediaStartedAt).getTime()
            session.meta.mediaStartedAt = null
        }

        session.isPaused = true

        return {
            action: this.createSuccessfulGameAction(
                {
                    id: state.creatorUserId,
                    type: 'player'
                },
                '$Pause',
                null
            ),
            stateChanged: true,
            success: true
        }
    }

    private async resumeSession(state: StoredLobbyState): Promise<JeopardyActionResult> {
        const session = this.getSession(state)

        if (!session) {
            return {
                code: 'game_not_started',
                message: 'There is no active Jeopardy session',
                success: false
            }
        }

        if (!session.isPaused) {
            return {
                code: 'not_paused',
                message: 'Jeopardy is not paused',
                success: false
            }
        }

        const nowMs = Date.now()
        const pausedTasks = [...session.meta.pausedTasks]

        await Promise.all(
            pausedTasks.map(task =>
                this.deps.scheduler.schedule({
                    key: task.key,
                    payload: task.payload,
                    scheduledAt: nowMs + task.remainingMs
                })
            )
        )

        const getRemainingMs = (type: LobbyScheduledTaskPayload['type']) => pausedTasks.find(task => task.payload.type === type)?.remainingMs || null

        session.meta.pausedTasks = []
        session.isPaused = false

        if (session.frame.id === 'question-content') {
            if (session.frame.answeringStatus === 'allowed') {
                const remainingMs = getRemainingMs('jeopardy.answer-request.complete')

                if (remainingMs) {
                    const phaseTiming = getPhaseTimingWindow(nowMs, JEOPARDY_ANSWER_REQUEST_DURATION_MS, remainingMs)

                    session.frame.answerRequestStartedAt = phaseTiming.startedAt
                    session.frame.answerRequestEndsAt = phaseTiming.endsAt
                    session.frame.answerRequestTimeLeft = phaseTiming.timeLeft
                }
            } else if (session.frame.answeringStatus === 'answering') {
                const remainingMs = getRemainingMs('jeopardy.answer-giving.complete')

                if (remainingMs) {
                    const phaseTiming = getPhaseTimingWindow(nowMs, JEOPARDY_ANSWER_GIVING_DURATION_MS, remainingMs)

                    session.frame.answerGivingStartedAt = phaseTiming.startedAt
                    session.frame.answerGivingEndsAt = phaseTiming.endsAt
                    session.frame.answerGivingTimeLeft = phaseTiming.timeLeft
                }
            } else if (session.frame.answeringStatus === 'answer-verifying') {
                const remainingMs = getRemainingMs('jeopardy.answer-verifying.complete')

                if (remainingMs) {
                    const phaseTiming = getPhaseTimingWindow(nowMs, JEOPARDY_ANSWER_VERIFYING_DURATION_MS, remainingMs)

                    session.frame.answerVerifyingStartedAt = phaseTiming.startedAt
                    session.frame.answerVerifyingEndsAt = phaseTiming.endsAt
                    session.frame.answerVerifyingTimeLeft = phaseTiming.timeLeft
                }
            }

            if ((session.frame.type === 'video' || session.frame.type === 'voice') && session.meta.mediaStartedAt === null) {
                session.meta.mediaStartedAt = nowIso()
            }
        }

        return {
            action: this.createSuccessfulGameAction(
                {
                    id: state.creatorUserId,
                    type: 'player'
                },
                '$Resume',
                null
            ),
            stateChanged: true,
            success: true
        }
    }

    private async handlePackPreviewCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId) {
            return {
                stateChanged: false
            }
        }

        await this.beginRoundPreview(state, state.game.session?.internal.currentRoundId || 0)

        return {
            stateChanged: true
        }
    }

    private async handleRoundPreviewThemeTask(state: StoredLobbyState, sessionId: string, roundId: number, themeIndex: number): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        const round = getRoundThemeNames(state.game.packDeclaration, roundId)

        if (!round || state.game.session.frame.id !== 'rounds-preview') {
            return {
                stateChanged: false
            }
        }

        const themeName = round.themeNames[themeIndex]

        if (!themeName) {
            return {
                stateChanged: false
            }
        }

        this.updateFrame(state, {
            id: 'rounds-preview',
            isRoundName: false,
            text: themeName
        })

        const nextThemeIndex = themeIndex + 1

        if (round.themeNames[nextThemeIndex]) {
            await this.scheduleTask(
                sessionId,
                `round-preview.theme.${nextThemeIndex}`,
                {
                    roundId,
                    sessionId,
                    themeIndex: nextThemeIndex,
                    type: 'jeopardy.round-preview.theme'
                },
                JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS
            )
        } else {
            await this.scheduleTask(
                sessionId,
                'round-preview.complete',
                {
                    roundId,
                    sessionId,
                    type: 'jeopardy.round-preview.complete'
                },
                JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS
            )
        }

        return {
            stateChanged: true
        }
    }

    private async handleRoundPreviewCompleteTask(state: StoredLobbyState, sessionId: string, roundId: number): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        if (isFinalRound(state.game.packDeclaration, roundId)) {
            await this.showFinalRoundBoard(state)
        } else {
            this.showQuestionBoard(state, roundId)
        }

        return {
            stateChanged: true
        }
    }

    private async handlePickQuestionCompleteTask(
        state: StoredLobbyState,
        sessionId: string,
        questionId: RealtimeJeopardyQuestionId
    ): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId) {
            return {
                stateChanged: false
            }
        }

        await this.beginQuestion(state, questionId)

        return {
            stateChanged: true
        }
    }

    private async handleQuestionAtomCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId) {
            return {
                stateChanged: false
            }
        }

        await this.showNextQuestionAtom(state)

        return {
            stateChanged: true
        }
    }

    private async handleAnswerRequestCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        const session = state.game.session

        if (session.frame.id !== 'question-content') {
            return {
                stateChanged: false
            }
        }

        this.updateFrame(state, {
            ...session.frame,
            answeringStatus: 'too-late',
            answerRequestStartedAt: null,
            answerRequestEndsAt: null,
            answerRequestTimeLeft: null
        })

        session.meta.answerRequestRemainingMs = null
        session.meta.currentQuestionFlow = session.meta.currentQuestionFlow
            ? {
                  ...session.meta.currentQuestionFlow,
                  shownAtomIndex: -1,
                  stage: 'after'
              }
            : null

        await this.showNextQuestionAtom(state)

        return {
            stateChanged: true
        }
    }

    private async handleAnswerGivingCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        if (state.game.session.frame.id !== 'question-content') {
            return {
                stateChanged: false
            }
        }

        this.updateInternal(state, {
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: state.game.session.frame.answeringPlayerId
        })

        await this.beginAnswerVerifying(state)

        return {
            stateChanged: true
        }
    }

    private async handleAnswerVerifyingCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        const session = state.game.session

        if (session.frame.id !== 'question-content') {
            return {
                stateChanged: false
            }
        }

        const currentAnsweringPlayerId = session.internal.currentAnsweringPlayerId
        const question = getJeopardyQuestionById(state.game.packDeclaration, session.frame.questionId)

        if (currentAnsweringPlayerId && question) {
            const answeringPlayer = state.members.find(member => member.id === currentAnsweringPlayerId && member.role === 'player')

            if (answeringPlayer) {
                answeringPlayer.playerScore -= parseInt(question._attributes.price, 10)
            }
        }

        this.updateInternal(state, {
            correctAnswers: null,
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: null,
            incorrectAnswers: null
        })

        await this.continueQuestionAfterAnswerResolution(state, false)

        return {
            stateChanged: true
        }
    }

    private async handleCooldownCompleteTask(state: StoredLobbyState, sessionId: string, userId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveLobbySessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        if (state.game.session.frame.id !== 'question-content' || !state.game.session.frame.playersOnCooldown.includes(userId)) {
            return {
                stateChanged: false
            }
        }

        this.updateFrame(state, {
            ...state.game.session.frame,
            playersOnCooldown: state.game.session.frame.playersOnCooldown.filter(playerId => playerId !== userId)
        })

        return {
            stateChanged: true
        }
    }
}
