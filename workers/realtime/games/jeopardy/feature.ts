import type { LobbyGameActionMessage } from '../../../../shared/contracts/realtime-lobby'
import type {
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
    getNormalizedQuestionById,
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
const JEOPARDY_SPECIAL_PLAYER_SELECTION_DURATION_MS = 30_000
const JEOPARDY_SPECIAL_STAKE_DURATION_MS = 30_000
const JEOPARDY_SPECIAL_DIRECT_ANSWER_DURATION_MS = 25_000
const JEOPARDY_SPECIAL_HIDDEN_ANSWER_DURATION_MS = 45_000
const JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS = 30_000
const JEOPARDY_FINAL_BETTING_DURATION_MS = 30_000
const JEOPARDY_FINAL_ANSWERING_DURATION_MS = 45_000

function getPhaseTimingWindow(nowMs: number, totalMs: number, remainingMs: number) {
    const boundedRemainingMs = Math.max(0, Math.min(remainingMs, totalMs))
    const startedAtMs = nowMs - (totalMs - boundedRemainingMs)

    return {
        endsAt: new Date(startedAtMs + totalMs).toISOString(),
        startedAt: new Date(startedAtMs).toISOString(),
        timeLeft: totalMs > 0 ? (boundedRemainingMs / totalMs) * 100 : 0
    }
}

function getQuestionAnswerDurationMs(questionType: string | undefined, answerDurationMs: number | null): number {
    if (answerDurationMs && answerDurationMs > 0) {
        return answerDurationMs
    }

    return questionType === 'forAll' || questionType === 'stakeAll' ? JEOPARDY_SPECIAL_HIDDEN_ANSWER_DURATION_MS : JEOPARDY_SPECIAL_DIRECT_ANSWER_DURATION_MS
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
        currentQuestionAnswers: {},
        currentQuestionBets: {},
        currentQuestionPrice: null,
        currentQuestionSelectedPlayerId: null,
        currentQuestionVerificationQueue: [],
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
                        JEOPARDY_PICK_QUESTION_DELAY_MS,
                        state
                    )
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$SelectQuestionPlayer': {
                if (session.frame.id !== 'question-content' || session.frame.specialPhase !== 'selecting-player') {
                    return {
                        code: 'invalid_frame',
                        message: 'Player selection is not active',
                        success: false
                    }
                }

                if (!isMaster && session.internal.pickerId !== userId) {
                    return {
                        code: 'forbidden',
                        message: 'Only the current chooser can transfer this question',
                        success: false
                    }
                }

                const payload = actionPayload as { playerId?: string } | null
                const playerId = payload?.playerId
                const flow = session.meta.currentQuestionFlow

                if (!playerId || !flow) {
                    return {
                        code: 'invalid_payload',
                        message: 'Player id is required',
                        success: false
                    }
                }

                const eligibleTargets = this.getEligibleSecretTargets(state, flow.selectionMode)

                if (!eligibleTargets.some(player => player.id === playerId)) {
                    return {
                        code: 'invalid_player',
                        message: 'Selected player is not eligible for this question',
                        success: false
                    }
                }

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'phase.selecting-player.complete', state)
                }

                this.updateInternal(state, {
                    currentQuestionSelectedPlayerId: playerId
                })

                await this.continueSecretQuestionAfterSelection(state)

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$SetQuestionValue': {
                if (
                    session.frame.id !== 'question-content' ||
                    !['choosing-price', 'making-hidden-stakes', 'making-stake'].includes(session.frame.specialPhase || '')
                ) {
                    return {
                        code: 'invalid_frame',
                        message: 'Question value selection is not active',
                        success: false
                    }
                }

                const payload = actionPayload as { value?: number } | null
                const value = payload?.value
                const flow = session.meta.currentQuestionFlow

                if (!flow || typeof value !== 'number' || value < 1) {
                    return {
                        code: 'invalid_payload',
                        message: 'A valid value is required',
                        success: false
                    }
                }

                const sessionId = this.getActiveLobbySessionId(state)

                if (session.frame.specialPhase === 'making-hidden-stakes') {
                    if (actor.id === state.creatorUserId || actor.playerScore <= 0) {
                        return {
                            code: 'invalid_bettor',
                            message: 'Only eligible contestants can make hidden stakes',
                            success: false
                        }
                    }

                    session.internal.currentQuestionBets = {
                        ...(session.internal.currentQuestionBets || {}),
                        [userId]: Math.min(value, actor.playerScore)
                    }

                    const playersThatMadeBet = Array.from(new Set([...(session.frame.playersThatMadeBet || []), userId]))

                    this.updateFrame(state, {
                        ...session.frame,
                        playersThatMadeBet
                    })

                    const eligiblePlayers = this.getContestants(state).filter(player => player.playerScore > 0)

                    if (playersThatMadeBet.length >= eligiblePlayers.length) {
                        if (sessionId) {
                            await this.cancelTask(sessionId, 'phase.making-hidden-stakes.complete', state)
                        }

                        await this.showNextQuestionAtom(state)
                    }

                    return {
                        stateChanged: true,
                        success: true
                    }
                }

                const allowedPlayerId =
                    session.frame.specialPhase === 'making-stake' ? session.internal.pickerId : session.internal.currentQuestionSelectedPlayerId

                if (!isMaster && allowedPlayerId !== userId) {
                    return {
                        code: 'forbidden',
                        message: 'You cannot set the value for this phase',
                        success: false
                    }
                }

                flow.currentPrice = value
                this.updateInternal(state, {
                    currentQuestionPrice: value
                })

                if (sessionId) {
                    const taskSuffix = session.frame.specialPhase === 'making-stake' ? 'phase.making-stake.complete' : 'phase.choosing-price.complete'

                    await this.cancelTask(sessionId, taskSuffix, state)
                }

                if (flow.questionType === 'secretNoQuestion') {
                    await this.resolveSecretNoQuestion(state)
                } else {
                    await this.showNextQuestionAtom(state)
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
                            JEOPARDY_ANSWER_COOLDOWN_MS,
                            state
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
                    await this.cancelTask(sessionId, 'answer-request.complete', state)
                    await this.scheduleTask(
                        sessionId,
                        'answer-giving.complete',
                        {
                            sessionId,
                            type: 'jeopardy.answer-giving.complete'
                        },
                        JEOPARDY_ANSWER_GIVING_DURATION_MS,
                        state
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
                if (session.frame.id !== 'question-content' || session.frame.answeringStatus !== 'answering') {
                    return {
                        code: 'invalid_answer_turn',
                        message: 'It is not your turn to answer',
                        success: false
                    }
                }

                const payload = actionPayload as { text?: string } | null
                const flow = session.meta.currentQuestionFlow
                const isMultiAnswerQuestion = flow?.questionType === 'forAll' || flow?.questionType === 'stakeAll'

                if (isMultiAnswerQuestion) {
                    const eligiblePlayers =
                        flow?.questionType === 'stakeAll'
                            ? this.getContestants(state).filter(player => Boolean(session.internal.currentQuestionBets?.[player.id]))
                            : this.getContestants(state)

                    if (
                        actor.id === state.creatorUserId ||
                        session.frame.playersWhoAnswered.includes(userId) ||
                        !eligiblePlayers.some(player => player.id === userId)
                    ) {
                        return {
                            code: 'invalid_answer_turn',
                            message: 'It is not your turn to answer',
                            success: false
                        }
                    }

                    session.internal.currentQuestionAnswers = {
                        ...(session.internal.currentQuestionAnswers || {}),
                        [userId]: {
                            value: payload?.text || '',
                            wager: session.internal.currentQuestionBets?.[userId]
                        }
                    }

                    const playersWhoAnswered = Array.from(new Set([...(session.frame.playersWhoAnswered || []), userId]))

                    this.updateFrame(state, {
                        ...session.frame,
                        playersWhoAnswered
                    })

                    if (playersWhoAnswered.length >= eligiblePlayers.length) {
                        const sessionId = this.getActiveLobbySessionId(state)

                        if (sessionId) {
                            await this.cancelTask(sessionId, 'phase.multi-answering.complete', state)
                        }

                        await this.beginAnswerVerifying(
                            state,
                            eligiblePlayers.map(player => player.id).filter(id => Boolean(session.internal.currentQuestionAnswers?.[id]))
                        )
                    }

                    return {
                        stateChanged: true,
                        success: true
                    }
                }

                if (session.frame.answeringPlayerId !== userId) {
                    return {
                        code: 'invalid_answer_turn',
                        message: 'It is not your turn to answer',
                        success: false
                    }
                }

                this.updateInternal(state, {
                    currentAnsweringPlayerAnswerText: payload?.text,
                    currentAnsweringPlayerId: userId,
                    currentQuestionAnswers: {
                        ...(session.internal.currentQuestionAnswers || {}),
                        [userId]: {
                            value: payload?.text || '',
                            wager: session.internal.currentQuestionBets?.[userId]
                        }
                    },
                    currentQuestionVerificationQueue: [userId]
                })

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'answer-giving.complete', state)
                }

                await this.beginAnswerVerifying(state, [userId])

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

                const currentPlayerId = session.internal.currentAnsweringPlayerId

                this.updateFrame(state, {
                    ...session.frame,
                    result: payload.rating
                })

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'answer-verifying.complete', state)
                }

                this.applyQuestionAnswerRating(state, currentPlayerId, payload.rating)

                const remainingQueue = (session.internal.currentQuestionVerificationQueue || []).filter(playerId => playerId !== currentPlayerId)

                if (remainingQueue.length) {
                    await this.beginAnswerVerifying(state, remainingQueue)
                } else {
                    const approvedAny =
                        payload.rating === 'approved' || Object.values(session.internal.currentQuestionAnswers || {}).some(answer => answer.rate === 'approved')

                    this.updateInternal(state, {
                        correctAnswers: null,
                        currentAnsweringPlayerAnswerText: null,
                        currentAnsweringPlayerId: null,
                        currentQuestionVerificationQueue: [],
                        incorrectAnswers: null
                    })

                    await this.continueQuestionAfterAnswerResolution(state, approvedAny)
                }

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
                        await this.cancelTask(sessionId, 'pack-preview.complete', state)
                        await this.beginRoundPreview(state, session.internal.currentRoundId)
                        return { stateChanged: true, success: true }
                    case 'rounds-preview':
                        await this.cancelTask(sessionId, 'round-preview.complete', state)
                        await this.deps.scheduler.cancelByPrefix(this.getTaskKey(sessionId, 'round-preview.theme.'))

                        if (isFinalRound(game.packDeclaration, session.internal.currentRoundId)) {
                            await this.showFinalRoundBoard(state)
                        } else {
                            this.showQuestionBoard(state, session.internal.currentRoundId)
                        }

                        return { stateChanged: true, success: true }
                    case 'question-content':
                        if (
                            session.frame.specialPhase &&
                            ['choosing-price', 'making-hidden-stakes', 'making-stake', 'selecting-player'].includes(session.frame.specialPhase)
                        ) {
                            const suffix = `phase.${session.frame.specialPhase}.complete`

                            await this.cancelTask(sessionId, suffix, state).catch(() => null)
                            await this.handlePhaseCompleteTask(state, sessionId, session.frame.specialPhase)
                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'allowed') {
                            await this.cancelTask(sessionId, 'answer-request.complete', state)
                            await this.handleAnswerRequestCompleteTask(state, sessionId)
                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'answering') {
                            if (session.meta.currentQuestionFlow?.questionType === 'forAll' || session.meta.currentQuestionFlow?.questionType === 'stakeAll') {
                                await this.cancelTask(sessionId, 'phase.multi-answering.complete', state).catch(() => null)
                                await this.beginAnswerVerifying(
                                    state,
                                    Object.keys(session.internal.currentQuestionAnswers || {}).filter(playerId =>
                                        session.frame.playersWhoAnswered.includes(playerId)
                                    )
                                )
                            } else {
                                await this.cancelTask(sessionId, 'answer-giving.complete', state)
                                const answeringPlayerId = session.frame.answeringPlayerId

                                this.updateInternal(state, {
                                    currentAnsweringPlayerAnswerText: null,
                                    currentAnsweringPlayerId: answeringPlayerId,
                                    currentQuestionAnswers: answeringPlayerId
                                        ? {
                                              ...(session.internal.currentQuestionAnswers || {}),
                                              [answeringPlayerId]: {
                                                  value: '',
                                                  wager: session.internal.currentQuestionBets?.[answeringPlayerId]
                                              }
                                          }
                                        : session.internal.currentQuestionAnswers,
                                    currentQuestionVerificationQueue: answeringPlayerId ? [answeringPlayerId] : []
                                })
                                await this.beginAnswerVerifying(state, answeringPlayerId ? [answeringPlayerId] : [])
                            }

                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'answer-verifying') {
                            await this.cancelTask(sessionId, 'answer-verifying.complete', state)
                            const currentAnsweringPlayerId = session.internal.currentAnsweringPlayerId
                            const remainingQueue = (session.internal.currentQuestionVerificationQueue || []).filter(
                                playerId => playerId !== currentAnsweringPlayerId
                            )

                            if (currentAnsweringPlayerId) {
                                this.applyQuestionAnswerRating(state, currentAnsweringPlayerId, 'declined')
                            }

                            if (remainingQueue.length) {
                                await this.beginAnswerVerifying(state, remainingQueue)
                            } else {
                                this.updateInternal(state, {
                                    correctAnswers: null,
                                    currentAnsweringPlayerAnswerText: null,
                                    currentAnsweringPlayerId: null,
                                    currentQuestionVerificationQueue: [],
                                    incorrectAnswers: null
                                })
                                await this.continueQuestionAfterAnswerResolution(state, false)
                            }
                            return { stateChanged: true, success: true }
                        }

                        await this.cancelTask(sessionId, 'question.atom.complete', state).catch(() => null)

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
                const playersThatMadeBet = Array.from(new Set([...(session.frame.playersThatMadeBet || []), userId]))

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatMadeBet
                })

                const eligibleBetters = this.getContestants(state).filter(player => player.playerScore > 0)

                if (playersThatMadeBet.length >= eligibleBetters.length) {
                    const sessionId = this.getActiveLobbySessionId(state)

                    if (sessionId) {
                        await this.cancelTask(sessionId, 'final.phase.betting.complete', state).catch(() => null)
                    }

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
                const playersThatAnswered = Array.from(new Set([...(session.frame.playersThatAnswered || []), userId]))

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatAnswered
                })

                const eligibleAnswerers = this.getContestants(state).filter(player => player.playerScore > 0)

                if (playersThatAnswered.length >= eligibleAnswerers.length) {
                    const sessionId = this.getActiveLobbySessionId(state)

                    if (sessionId) {
                        await this.cancelTask(sessionId, 'final.phase.answering.complete', state).catch(() => null)
                    }

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
                if (
                    session.frame.id !== 'question-content' ||
                    (session.frame.type !== 'video' && session.frame.type !== 'voice') ||
                    !['showing-answer', 'showing-question'].includes(session.frame.specialPhase || '')
                ) {
                    return {
                        stateChanged: false,
                        success: true
                    }
                }

                const payload = actionPayload as {
                    content?: string
                    mediaStartedAt?: string | null
                    questionId?: RealtimeJeopardyQuestionId
                    type?: 'video' | 'voice'
                } | null
                const doesPayloadMatchActiveMedia =
                    (!payload?.questionId || payload.questionId === session.frame.questionId) &&
                    (!payload?.type || payload.type === session.frame.type) &&
                    (!payload?.mediaStartedAt || payload.mediaStartedAt === session.frame.mediaStartedAt) &&
                    (payload?.content === undefined || payload.content === session.frame.content)

                if (!doesPayloadMatchActiveMedia) {
                    return {
                        stateChanged: false,
                        success: true
                    }
                }

                const sessionId = this.getActiveLobbySessionId(state)

                if (sessionId) {
                    await this.cancelTask(sessionId, 'question.atom.complete', state).catch(() => null)
                }

                session.meta.mediaElapsedTimeMs = 0
                session.meta.mediaStartedAt = null
                this.clearQuestionPhaseTimer(state)
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
            case 'jeopardy.phase.complete':
                return this.handlePhaseCompleteTask(state, task.sessionId, task.phase)
            case 'jeopardy.final.phase.complete':
                return this.handleFinalPhaseCompleteTask(state, task.sessionId, task.phase)
            default:
                return {
                    stateChanged: false
                }
        }
    }

    async reconcileSessionMembers(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)

        if (!session) {
            return
        }

        const playerIds = new Set(state.members.filter(member => member.role === 'player').map(member => member.id))
        const contestantIds = new Set(this.getContestants(state).map(member => member.id))

        session.internal.finalAnswers = Object.fromEntries(Object.entries(session.internal.finalAnswers).filter(([playerId]) => contestantIds.has(playerId)))
        session.internal.finalBets = Object.fromEntries(Object.entries(session.internal.finalBets).filter(([playerId]) => contestantIds.has(playerId)))
        session.internal.currentQuestionAnswers = Object.fromEntries(
            Object.entries(session.internal.currentQuestionAnswers || {}).filter(([playerId]) => contestantIds.has(playerId))
        )
        session.internal.currentQuestionBets = Object.fromEntries(
            Object.entries(session.internal.currentQuestionBets || {}).filter(([playerId]) => contestantIds.has(playerId))
        )
        session.internal.currentQuestionVerificationQueue = (session.internal.currentQuestionVerificationQueue || []).filter(playerId =>
            contestantIds.has(playerId)
        )

        if (session.internal.pickerId && !playerIds.has(session.internal.pickerId)) {
            session.internal.pickerId = this.getFallbackPickerId(state)
        }

        if (session.internal.currentQuestionSelectedPlayerId && !contestantIds.has(session.internal.currentQuestionSelectedPlayerId)) {
            session.internal.currentQuestionSelectedPlayerId = null
        }

        switch (session.frame.id) {
            case 'question-board': {
                if (playerIds.has(session.frame.pickerId)) {
                    return
                }

                this.updateFrame(state, {
                    ...session.frame,
                    pickerId: this.getFallbackPickerId(state)
                })
                return
            }
            case 'question-content': {
                const playersOnCooldown = this.filterMemberIds(session.frame.playersOnCooldown, contestantIds)
                const playersThatMadeBet = this.filterMemberIds(session.frame.playersThatMadeBet || [], contestantIds)
                const playersWhoAnswered = this.filterMemberIds(session.frame.playersWhoAnswered, contestantIds)
                const skipVoted = this.filterMemberIds(session.frame.skipVoted, playerIds)
                const sessionId = this.getActiveLobbySessionId(state)
                const nextFrameBase = {
                    ...session.frame,
                    playersOnCooldown,
                    playersThatMadeBet,
                    playersWhoAnswered,
                    selectedPlayerId:
                        session.internal.currentQuestionSelectedPlayerId && contestantIds.has(session.internal.currentQuestionSelectedPlayerId)
                            ? session.internal.currentQuestionSelectedPlayerId
                            : null,
                    skipVoted
                }

                if (
                    session.frame.answeringStatus === 'answering' &&
                    session.meta.currentQuestionFlow?.questionType !== 'forAll' &&
                    session.meta.currentQuestionFlow?.questionType !== 'stakeAll' &&
                    (!session.frame.answeringPlayerId || !contestantIds.has(session.frame.answeringPlayerId))
                ) {
                    this.updateFrame(state, {
                        ...nextFrameBase,
                        answeringPlayerId: null
                    })
                    this.updateInternal(state, {
                        currentAnsweringPlayerAnswerText: null,
                        currentAnsweringPlayerId: null
                    })

                    if (sessionId) {
                        await this.cancelTask(sessionId, 'answer-giving.complete', state)
                    }

                    await this.continueQuestionAfterAnswerResolution(state, false)
                    return
                }

                if (
                    session.frame.answeringStatus === 'answer-verifying' &&
                    (!session.internal.currentAnsweringPlayerId || !contestantIds.has(session.internal.currentAnsweringPlayerId))
                ) {
                    this.updateFrame(state, {
                        ...nextFrameBase,
                        result: undefined
                    })
                    this.updateInternal(state, {
                        correctAnswers: null,
                        currentAnsweringPlayerAnswerText: null,
                        currentAnsweringPlayerId: null,
                        incorrectAnswers: null
                    })

                    if (sessionId) {
                        await this.cancelTask(sessionId, 'answer-verifying.complete', state)
                    }

                    if ((session.internal.currentQuestionVerificationQueue || []).length > 0) {
                        await this.beginAnswerVerifying(state, session.internal.currentQuestionVerificationQueue || [])
                    } else {
                        await this.continueQuestionAfterAnswerResolution(state, false)
                    }
                    return
                }

                this.updateFrame(state, {
                    ...nextFrameBase,
                    answeringPlayerId:
                        session.frame.answeringPlayerId && contestantIds.has(session.frame.answeringPlayerId) ? session.frame.answeringPlayerId : null
                })

                if (session.internal.currentAnsweringPlayerId && !contestantIds.has(session.internal.currentAnsweringPlayerId)) {
                    this.updateInternal(state, {
                        currentAnsweringPlayerAnswerText: null,
                        currentAnsweringPlayerId: null
                    })
                }

                return
            }
            case 'final-round-board': {
                const playersThatMadeBet = this.filterMemberIds(session.frame.playersThatMadeBet, contestantIds)
                const playersThatAnswered = this.filterMemberIds(session.frame.playersThatAnswered, contestantIds)
                const nextSkipperId =
                    session.frame.status === 'skipping'
                        ? session.frame.skipperId && playerIds.has(session.frame.skipperId)
                            ? session.frame.skipperId
                            : this.getFallbackSkipperId(state)
                        : session.frame.skipperId && playerIds.has(session.frame.skipperId)
                          ? session.frame.skipperId
                          : null

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatAnswered,
                    playersThatMadeBet,
                    skipperId: nextSkipperId
                })

                if (session.frame.status === 'betting') {
                    const eligibleBetters = this.getContestants(state).filter(player => player.playerScore > 0)

                    if (!eligibleBetters.length) {
                        await this.showFinalScores(state)
                        return
                    }

                    if (playersThatMadeBet.length >= eligibleBetters.length) {
                        await this.beginFinalQuestionAnswering(state)
                    }

                    return
                }

                if (session.frame.status === 'answering') {
                    const eligibleAnswerers = this.getContestants(state).filter(player => player.playerScore > 0)

                    if (!eligibleAnswerers.length) {
                        await this.showFinalScores(state)
                        return
                    }

                    if (playersThatAnswered.length >= eligibleAnswerers.length) {
                        this.beginFinalQuestionVerifying(state)
                    }

                    return
                }

                if (session.frame.status === 'answer-verifying') {
                    const hasValidFinalAnswers = this.getContestants(state)
                        .filter(player => player.playerScore > 0)
                        .some(player => Boolean(session.internal.finalAnswers[player.id]))

                    if (!hasValidFinalAnswers) {
                        await this.showFinalScores(state)
                    }
                }

                return
            }
        }
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
            this.getContestants(state).reduce(
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

    private getFallbackPickerId(state: StoredLobbyState): string {
        return this.getContestants(state)[0]?.id || this.getMaster(state)?.id || state.members.find(member => member.role === 'player')?.id || ''
    }

    private getFallbackSkipperId(state: StoredLobbyState): string | null {
        return this.getContestants(state)[0]?.id || this.getFallbackPickerId(state) || null
    }

    private filterMemberIds(ids: string[], allowedIds: Set<string>): string[] {
        return ids.filter(id => allowedIds.has(id))
    }

    private getCurrentQuestionPrice(session: StoredJeopardySession): number {
        return session.meta.currentQuestionFlow?.currentPrice || session.internal.currentQuestionPrice || 0
    }

    private getEligibleSecretTargets(state: StoredLobbyState, selectionMode: 'any' | 'exceptCurrent'): StoredLobbyMember[] {
        const session = this.getSession(state)
        const pickerId = session?.internal.pickerId

        return this.getContestants(state).filter(player => selectionMode === 'any' || player.id !== pickerId)
    }

    private getHighestScoringContestant(state: StoredLobbyState): StoredLobbyMember | null {
        return (
            this.getContestants(state).reduce(
                (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                null as StoredLobbyMember | null
            ) || null
        )
    }

    private setQuestionPhaseTimer(
        state: StoredLobbyState,
        totalMs: number,
        remainingMs: number,
        patch: Partial<RealtimeJeopardyState.QuestionContentFrame>
    ): void {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'question-content') {
            return
        }

        const timing = getPhaseTimingWindow(Date.now(), totalMs, remainingMs)

        this.updateFrame(state, {
            ...session.frame,
            ...patch,
            phaseEndsAt: timing.endsAt,
            phaseStartedAt: timing.startedAt,
            phaseTimeLeft: timing.timeLeft
        })
    }

    private clearQuestionPhaseTimer(state: StoredLobbyState): void {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'question-content') {
            return
        }

        this.updateFrame(state, {
            ...session.frame,
            phaseEndsAt: null,
            phaseStartedAt: null,
            phaseTimeLeft: null
        })
    }

    private setFinalPhaseTimer(
        state: StoredLobbyState,
        totalMs: number,
        remainingMs: number,
        patch: Partial<RealtimeJeopardyState.FinalRoundBoardFrame>
    ): void {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'final-round-board') {
            return
        }

        const timing = getPhaseTimingWindow(Date.now(), totalMs, remainingMs)

        this.updateFrame(state, {
            ...session.frame,
            ...patch,
            phaseEndsAt: timing.endsAt,
            phaseStartedAt: timing.startedAt,
            phaseTimeLeft: timing.timeLeft
        })
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

    private async scheduleTask(
        sessionId: string,
        suffix: string,
        payload: LobbyScheduledTaskPayload,
        delayMs: number,
        state?: StoredLobbyState
    ): Promise<void> {
        const session = state ? this.getSession(state) : null
        const key = this.getTaskKey(sessionId, suffix)
        const remainingMs = Math.max(delayMs, 0)

        if (session?.isPaused) {
            session.meta.pausedTasks = [
                ...session.meta.pausedTasks.filter(task => task.key !== key),
                {
                    key,
                    payload,
                    remainingMs
                }
            ].sort((left, right) => left.remainingMs - right.remainingMs)
            return
        }

        await this.deps.scheduler.schedule({
            key,
            payload,
            scheduledAt: Date.now() + remainingMs
        })
    }

    private async cancelTask(sessionId: string, suffix: string, state?: StoredLobbyState): Promise<void> {
        const session = state ? this.getSession(state) : null
        const key = this.getTaskKey(sessionId, suffix)

        if (session?.isPaused) {
            session.meta.pausedTasks = session.meta.pausedTasks.filter(task => task.key !== key)
            return
        }

        await this.deps.scheduler.cancel(key)
    }

    private async cancelSessionTasks(sessionId: string, state?: StoredLobbyState): Promise<void> {
        const session = state ? this.getSession(state) : null
        const prefix = this.getSessionTaskPrefix(sessionId)

        if (session?.isPaused) {
            session.meta.pausedTasks = session.meta.pausedTasks.filter(task => !task.key.startsWith(prefix))
            return
        }

        await this.deps.scheduler.cancelByPrefix(prefix)
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

        await this.scheduleTask(
            sessionId,
            'pack-preview.complete',
            { sessionId, type: 'jeopardy.pack-preview.complete' },
            JEOPARDY_PACK_PREVIEW_DURATION_MS,
            state
        )
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
        await this.cancelTask(sessionId, 'round-preview.complete', state).catch(() => null)

        if (!round.themeNames.length) {
            await this.scheduleTask(
                sessionId,
                'round-preview.complete',
                {
                    roundId,
                    sessionId,
                    type: 'jeopardy.round-preview.complete'
                },
                JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS,
                state
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
            JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS,
            state
        )
    }

    private showQuestionBoard(state: StoredLobbyState, roundId: number): void {
        const game = this.getGame(state)
        const session = this.getSession(state)

        if (!game || !session) {
            return
        }

        const pickerId =
            session.internal.pickerId && state.members.some(member => member.id === session.internal.pickerId && member.role === 'player')
                ? session.internal.pickerId
                : this.getFallbackPickerId(state)
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

        const activePickerId =
            session.internal.pickerId && state.members.some(member => member.id === session.internal.pickerId && member.role === 'player')
                ? session.internal.pickerId
                : session.frame.id === 'question-board'
                  ? session.frame.pickerId
                  : this.getFallbackPickerId(state)

        const question = getNormalizedQuestionById(game.packDeclaration, questionId)

        if (!question) {
            return
        }

        session.meta.currentQuestionFlow = {
            afterAtoms: question.answerItems,
            answerDurationMs: question.answerDurationMs,
            beforeAtoms: question.questionItems,
            currentPrice: question.price * question.priceMultiplier,
            priceMultiplier: question.priceMultiplier,
            priceOptions: question.priceOptions,
            questionTheme: question.questionTheme,
            questionId,
            questionType: question.type,
            selectionMode: question.selectionMode,
            shownAtomIndex: -1,
            stage: 'before'
        }
        session.meta.answerRequestRemainingMs = null
        this.updateInternal(state, {
            answerIsApproved: null,
            correctAnswers: null,
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: null,
            currentQuestionAnswers: {},
            currentQuestionBets: {},
            currentQuestionPrice: session.meta.currentQuestionFlow.currentPrice,
            currentQuestionSelectedPlayerId: null,
            currentQuestionVerificationQueue: [],
            incorrectAnswers: null,
            pickerId: activePickerId
        })

        if (question.type === 'stake') {
            await this.beginStakeSelection(state)
            return
        }

        if (question.type === 'secret' || question.type === 'secretPublicPrice' || question.type === 'secretNoQuestion') {
            await this.beginSecretQuestionSelection(state)
            return
        }

        if (question.type === 'stakeAll') {
            await this.beginHiddenStakeCollection(state)
            return
        }

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
                if (flow.questionType === 'simple' || flow.questionType === 'custom') {
                    await this.beginAnswerRequest(state, JEOPARDY_ANSWER_REQUEST_DURATION_MS)
                    return
                }

                if (flow.questionType === 'forAll' || flow.questionType === 'stakeAll') {
                    await this.beginMultiPlayerAnswering(state)
                    return
                }

                await this.beginDirectAnswering(state)
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
        atom: NonNullable<StoredJeopardySession['meta']['currentQuestionFlow']>['beforeAtoms'][number],
        beforeMarker: boolean
    ): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!session || !sessionId) {
            return
        }

        const previousPlayersOnCooldown = session.frame.id === 'question-content' ? [...session.frame.playersOnCooldown] : ([] as string[])
        const previousPlayersWhoAnswered = session.frame.id === 'question-content' ? [...session.frame.playersWhoAnswered] : ([] as string[])
        const previousPlayersThatMadeBet = session.frame.id === 'question-content' ? [...(session.frame.playersThatMadeBet || [])] : ([] as string[])
        const type = atom.type

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
            answerRequestTimeLeft: null,
            answerGivingTimeLeft: null,
            answerVerifyingTimeLeft: null,
            answeringPlayerId: null,
            elapsedMediaTimeMs: this.getMediaElapsedTimeMs(session),
            content: atom.content,
            contentPlacement: atom.placement,
            id: 'question-content',
            isRef: atom.isRef,
            mediaStartedAt: session.meta.mediaStartedAt,
            phaseEndsAt: null,
            phaseStartedAt: null,
            phaseTimeLeft: null,
            playersOnCooldown: previousPlayersOnCooldown,
            playersThatMadeBet: previousPlayersThatMadeBet,
            playersWhoAnswered: previousPlayersWhoAnswered,
            questionId,
            questionPrice: this.getCurrentQuestionPrice(session),
            questionTheme: session.meta.currentQuestionFlow?.questionTheme,
            questionType: session.meta.currentQuestionFlow?.questionType,
            selectedPlayerId: session.internal.currentQuestionSelectedPlayerId,
            skipVoted: [],
            specialPhase: beforeMarker ? 'showing-question' : 'showing-answer',
            answeringStatus: beforeMarker ? 'too-early' : 'too-late',
            result: undefined,
            type
        })

        const autoAdvanceDelayMs = atom.durationMs ?? JEOPARDY_CONTENT_DEFAULT_DURATION_MS

        if ((type === 'video' || type === 'voice') && atom.waitForFinish) {
            return
        }

        this.setQuestionPhaseTimer(state, Math.max(autoAdvanceDelayMs, 0), Math.max(autoAdvanceDelayMs, 0), {})

        await this.scheduleTask(
            sessionId,
            'question.atom.complete',
            {
                sessionId,
                type: 'jeopardy.question.atom.complete'
            },
            Math.max(autoAdvanceDelayMs, 0),
            state
        )
    }

    private async beginStakeSelection(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)
        const flow = session?.meta.currentQuestionFlow
        const stakerId = session?.internal.pickerId || this.getFallbackPickerId(state)
        const staker = this.getContestants(state).find(player => player.id === stakerId)

        if (!session || !sessionId || !flow || !staker) {
            return
        }

        const minimumStake = Math.max(1, Math.min(flow.currentPrice, Math.max(staker.playerScore, 1)))
        const maximumStake = Math.max(minimumStake, Math.max(staker.playerScore, flow.currentPrice, 1))
        const priceOptions = minimumStake === maximumStake ? [minimumStake] : [minimumStake, maximumStake]

        this.updateFrame(state, {
            answerGivingTimeLeft: null,
            answerRequestTimeLeft: null,
            answerVerifyingTimeLeft: null,
            answeringPlayerId: staker.id,
            answeringStatus: 'too-early',
            content: 'Select your stake',
            id: 'question-content',
            playersOnCooldown: [],
            playersThatMadeBet: [],
            playersWhoAnswered: [],
            priceOptions,
            questionId: flow.questionId,
            questionPrice: flow.currentPrice,
            questionTheme: flow.questionTheme,
            questionType: flow.questionType,
            selectedPlayerId: null,
            skipVoted: [],
            specialPhase: 'making-stake',
            type: 'text'
        })
        this.setQuestionPhaseTimer(state, JEOPARDY_SPECIAL_STAKE_DURATION_MS, JEOPARDY_SPECIAL_STAKE_DURATION_MS, {
            eligiblePlayerIds: [staker.id],
            priceOptions
        })

        await this.scheduleTask(
            sessionId,
            'phase.making-stake.complete',
            {
                phase: 'making-stake',
                sessionId,
                type: 'jeopardy.phase.complete'
            },
            JEOPARDY_SPECIAL_STAKE_DURATION_MS,
            state
        )
    }

    private async continueSecretQuestionAfterSelection(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const flow = session?.meta.currentQuestionFlow

        if (!session || !flow) {
            return
        }

        if (flow.priceOptions.length > 1) {
            await this.beginQuestionValueSelection(state)
            return
        }

        flow.currentPrice = flow.priceOptions[0] || flow.currentPrice
        this.updateInternal(state, {
            currentQuestionPrice: flow.currentPrice
        })

        if (flow.questionType === 'secretNoQuestion') {
            await this.resolveSecretNoQuestion(state)
        } else {
            await this.showNextQuestionAtom(state)
        }
    }

    private async beginSecretQuestionSelection(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)
        const flow = session?.meta.currentQuestionFlow

        if (!session || !sessionId || !flow) {
            return
        }

        const eligibleTargets = this.getEligibleSecretTargets(state, flow.selectionMode)

        if (!eligibleTargets.length) {
            const fallbackPlayerId = session.internal.pickerId || this.getFallbackPickerId(state)

            if (!fallbackPlayerId) {
                return
            }

            this.updateInternal(state, {
                currentQuestionSelectedPlayerId: fallbackPlayerId
            })

            await this.continueSecretQuestionAfterSelection(state)
            return
        }

        this.updateFrame(state, {
            answerGivingTimeLeft: null,
            answerRequestTimeLeft: null,
            answerVerifyingTimeLeft: null,
            answeringPlayerId: session.internal.pickerId,
            answeringStatus: 'too-early',
            content: 'Select the player who will receive this question',
            id: 'question-content',
            playersOnCooldown: [],
            playersThatMadeBet: [],
            playersWhoAnswered: [],
            priceOptions: flow.priceOptions,
            questionId: flow.questionId,
            questionPrice: flow.questionType === 'secretPublicPrice' && flow.priceOptions.length === 1 ? flow.priceOptions[0] : flow.currentPrice,
            questionTheme: flow.questionTheme,
            questionType: flow.questionType,
            selectedPlayerId: null,
            skipVoted: [],
            specialPhase: 'selecting-player',
            type: 'text'
        })
        this.setQuestionPhaseTimer(state, JEOPARDY_SPECIAL_PLAYER_SELECTION_DURATION_MS, JEOPARDY_SPECIAL_PLAYER_SELECTION_DURATION_MS, {
            eligiblePlayerIds: eligibleTargets.map(player => player.id),
            priceOptions: flow.priceOptions
        })

        await this.scheduleTask(
            sessionId,
            'phase.selecting-player.complete',
            {
                phase: 'selecting-player',
                sessionId,
                type: 'jeopardy.phase.complete'
            },
            JEOPARDY_SPECIAL_PLAYER_SELECTION_DURATION_MS,
            state
        )
    }

    private async beginQuestionValueSelection(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)
        const flow = session?.meta.currentQuestionFlow
        const chooserId = session?.internal.currentQuestionSelectedPlayerId || session?.internal.pickerId

        if (!session || !sessionId || !flow || !chooserId) {
            return
        }

        this.updateFrame(state, {
            answerGivingTimeLeft: null,
            answerRequestTimeLeft: null,
            answerVerifyingTimeLeft: null,
            answeringPlayerId: chooserId,
            answeringStatus: 'too-early',
            content: 'Choose the question value',
            id: 'question-content',
            playersOnCooldown: [],
            playersThatMadeBet: [],
            playersWhoAnswered: [],
            priceOptions: flow.priceOptions,
            questionId: flow.questionId,
            questionPrice: flow.currentPrice,
            questionTheme: flow.questionTheme,
            questionType: flow.questionType,
            selectedPlayerId: session.internal.currentQuestionSelectedPlayerId,
            skipVoted: [],
            specialPhase: 'choosing-price',
            type: 'text'
        })
        this.setQuestionPhaseTimer(state, JEOPARDY_SPECIAL_STAKE_DURATION_MS, JEOPARDY_SPECIAL_STAKE_DURATION_MS, {
            eligiblePlayerIds: [chooserId],
            priceOptions: flow.priceOptions,
            selectedPlayerId: session.internal.currentQuestionSelectedPlayerId
        })

        await this.scheduleTask(
            sessionId,
            'phase.choosing-price.complete',
            {
                phase: 'choosing-price',
                sessionId,
                type: 'jeopardy.phase.complete'
            },
            JEOPARDY_SPECIAL_STAKE_DURATION_MS,
            state
        )
    }

    private async resolveSecretNoQuestion(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const selectedPlayerId = session?.internal.currentQuestionSelectedPlayerId
        const selectedPlayer = state.members.find(member => member.id === selectedPlayerId && member.role === 'player')

        if (!session || !selectedPlayer) {
            return
        }

        selectedPlayer.playerScore += this.getCurrentQuestionPrice(session)

        this.updateInternal(state, {
            pickerId: selectedPlayer.id
        })

        await this.finalizeQuestion(state)
    }

    private async beginHiddenStakeCollection(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)
        const flow = session?.meta.currentQuestionFlow
        const eligiblePlayers = this.getContestants(state).filter(player => player.playerScore > 0)

        if (!session || !sessionId || !flow) {
            return
        }

        if (!eligiblePlayers.length) {
            await this.showNextQuestionAtom(state)
            return
        }

        this.updateInternal(state, {
            currentQuestionBets: {}
        })
        this.updateFrame(state, {
            answerGivingTimeLeft: null,
            answerRequestTimeLeft: null,
            answerVerifyingTimeLeft: null,
            answeringPlayerId: null,
            answeringStatus: 'too-early',
            content: 'Make your hidden stake',
            id: 'question-content',
            playersOnCooldown: [],
            playersThatMadeBet: [],
            playersWhoAnswered: [],
            questionId: flow.questionId,
            questionPrice: flow.currentPrice,
            questionTheme: flow.questionTheme,
            questionType: flow.questionType,
            selectedPlayerId: null,
            skipVoted: [],
            specialPhase: 'making-hidden-stakes',
            type: 'text'
        })
        this.setQuestionPhaseTimer(state, JEOPARDY_SPECIAL_STAKE_DURATION_MS, JEOPARDY_SPECIAL_STAKE_DURATION_MS, {
            eligiblePlayerIds: eligiblePlayers.map(player => player.id)
        })

        await this.scheduleTask(
            sessionId,
            'phase.making-hidden-stakes.complete',
            {
                phase: 'making-hidden-stakes',
                sessionId,
                type: 'jeopardy.phase.complete'
            },
            JEOPARDY_SPECIAL_STAKE_DURATION_MS,
            state
        )
    }

    private async beginDirectAnswering(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)
        const flow = session?.meta.currentQuestionFlow
        const answererId = session?.internal.currentQuestionSelectedPlayerId || session?.internal.pickerId || this.getFallbackPickerId(state)

        if (!session || !sessionId || !flow || !answererId || session.frame.id !== 'question-content') {
            return
        }

        const durationMs = getQuestionAnswerDurationMs(flow.questionType, flow.answerDurationMs)
        const timing = getPhaseTimingWindow(Date.now(), durationMs, durationMs)

        this.clearQuestionPhaseTimer(state)
        this.updateFrame(state, {
            ...session.frame,
            answeringPlayerId: answererId,
            answeringStatus: 'answering',
            answerRequestEndsAt: null,
            answerRequestStartedAt: null,
            answerRequestTimeLeft: null,
            answerGivingEndsAt: timing.endsAt,
            answerGivingStartedAt: timing.startedAt,
            answerGivingTimeLeft: timing.timeLeft,
            answerVerifyingEndsAt: null,
            answerVerifyingStartedAt: null,
            answerVerifyingTimeLeft: null,
            eligiblePlayerIds: [answererId],
            playersWhoAnswered: [answererId],
            questionPrice: flow.currentPrice,
            questionTheme: flow.questionTheme,
            questionType: flow.questionType,
            selectedPlayerId: session.internal.currentQuestionSelectedPlayerId,
            specialPhase: undefined
        })

        await this.scheduleTask(
            sessionId,
            'answer-giving.complete',
            {
                sessionId,
                type: 'jeopardy.answer-giving.complete'
            },
            durationMs,
            state
        )
    }

    private async beginMultiPlayerAnswering(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)
        const flow = session?.meta.currentQuestionFlow

        if (!session || !sessionId || !flow || session.frame.id !== 'question-content') {
            return
        }

        const eligiblePlayers =
            flow.questionType === 'stakeAll'
                ? this.getContestants(state).filter(player => Boolean(session.internal.currentQuestionBets?.[player.id]))
                : this.getContestants(state)

        if (!eligiblePlayers.length) {
            await this.continueQuestionAfterAnswerResolution(state, false)
            return
        }

        const durationMs = getQuestionAnswerDurationMs(flow.questionType, flow.answerDurationMs)
        const timing = getPhaseTimingWindow(Date.now(), durationMs, durationMs)

        this.clearQuestionPhaseTimer(state)
        this.updateFrame(state, {
            ...session.frame,
            answeringPlayerId: null,
            answeringStatus: 'answering',
            answerRequestEndsAt: null,
            answerRequestStartedAt: null,
            answerRequestTimeLeft: null,
            answerGivingEndsAt: timing.endsAt,
            answerGivingStartedAt: timing.startedAt,
            answerGivingTimeLeft: timing.timeLeft,
            answerVerifyingEndsAt: null,
            answerVerifyingStartedAt: null,
            answerVerifyingTimeLeft: null,
            eligiblePlayerIds: eligiblePlayers.map(player => player.id),
            playersWhoAnswered: [],
            questionPrice: flow.currentPrice,
            questionTheme: flow.questionTheme,
            questionType: flow.questionType,
            specialPhase: undefined
        })

        await this.scheduleTask(
            sessionId,
            'phase.multi-answering.complete',
            {
                phase: 'multi-answering',
                sessionId,
                type: 'jeopardy.phase.complete'
            },
            durationMs,
            state
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
            result: undefined,
            specialPhase: undefined
        })

        await this.scheduleTask(
            sessionId,
            'answer-request.complete',
            {
                sessionId,
                type: 'jeopardy.answer-request.complete'
            },
            remainingMs,
            state
        )
    }

    private applyQuestionAnswerRating(state: StoredLobbyState, playerId: string, rating: 'approved' | 'declined'): void {
        const session = this.getSession(state)
        const flow = session?.meta.currentQuestionFlow
        const player = state.members.find(member => member.id === playerId && member.role === 'player')
        const wager = session?.internal.currentQuestionAnswers?.[playerId]?.wager || session?.internal.currentQuestionBets?.[playerId]
        const delta = wager || (session ? this.getCurrentQuestionPrice(session) : 0)
        const isNoRisk = flow?.questionType === 'forYourself' || flow?.questionType === 'noRisk'

        if (!session || !player) {
            return
        }

        if (session.internal.currentQuestionAnswers?.[playerId]) {
            session.internal.currentQuestionAnswers[playerId].rate = rating
        }

        player.playerScore += rating === 'approved' ? delta : isNoRisk ? 0 : -delta

        if (rating === 'approved') {
            session.internal.pickerId = playerId
        }
    }

    private async beginAnswerVerifying(state: StoredLobbyState, playerIds?: string[]): Promise<void> {
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
            currentQuestionVerificationQueue: playerIds || session.internal.currentQuestionVerificationQueue || [],
            incorrectAnswers: answers[1]
        })

        const verificationQueue = [...(playerIds || session.internal.currentQuestionVerificationQueue || [])]
        const currentPlayerId = verificationQueue[0] || session.internal.currentAnsweringPlayerId
        const currentAnswerText =
            (currentPlayerId ? session.internal.currentQuestionAnswers?.[currentPlayerId]?.value : null) ||
            session.internal.currentAnsweringPlayerAnswerText ||
            null

        this.updateInternal(state, {
            currentAnsweringPlayerAnswerText: currentAnswerText,
            currentAnsweringPlayerId: currentPlayerId
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
            answerVerifyingTimeLeft: phaseTiming.timeLeft,
            specialPhase: 'question-verifying'
        })

        await this.scheduleTask(
            sessionId,
            'answer-verifying.complete',
            {
                sessionId,
                type: 'jeopardy.answer-verifying.complete'
            },
            JEOPARDY_ANSWER_VERIFYING_DURATION_MS,
            state
        )
    }

    private async continueQuestionAfterAnswerResolution(state: StoredLobbyState, approved: boolean): Promise<void> {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'question-content') {
            return
        }

        if (session.meta.currentQuestionFlow?.questionType === 'simple' && !approved && (session.meta.answerRequestRemainingMs || 0) > 0) {
            await this.beginAnswerRequest(state, session.meta.answerRequestRemainingMs || 0)
            return
        }

        session.meta.answerRequestRemainingMs = null

        if (session.meta.currentQuestionFlow) {
            session.meta.currentQuestionFlow.stage = 'after'
            session.meta.currentQuestionFlow.shownAtomIndex = -1
        }

        this.updateInternal(state, {
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: null,
            currentQuestionVerificationQueue: []
        })

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
            answeredQuestions,
            correctAnswers: null,
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: null,
            currentQuestionAnswers: {},
            currentQuestionBets: {},
            currentQuestionPrice: null,
            currentQuestionSelectedPlayerId: null,
            currentQuestionVerificationQueue: [],
            incorrectAnswers: null
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
        const sessionId = this.getActiveLobbySessionId(state)

        if (!game || !session || !sessionId) {
            return
        }

        this.updateFrame(state, {
            id: 'final-round-board',
            phaseEndsAt: null,
            phaseStartedAt: null,
            phaseTimeLeft: null,
            themes: getFinalThemes(game.packDeclaration).map(name => ({
                name,
                skipped: false
            })),
            skipperId:
                session.internal.pickerId && state.members.some(member => member.id === session.internal.pickerId && member.role === 'player')
                    ? session.internal.pickerId
                    : this.getFallbackSkipperId(state),
            playersThatAnswered: [],
            playersThatMadeBet: [],
            status: 'skipping'
        })
        this.setFinalPhaseTimer(state, JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS, JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS, {})

        await this.scheduleTask(
            sessionId,
            'final.phase.skipping.complete',
            {
                phase: 'skipping',
                sessionId,
                type: 'jeopardy.final.phase.complete'
            },
            JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS,
            state
        )
    }

    private async beginFinalRoundBetting(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!session || !sessionId || session.frame.id !== 'final-round-board') {
            return
        }

        await this.cancelTask(sessionId, 'final.phase.skipping.complete', state).catch(() => null)

        this.setFinalPhaseTimer(state, JEOPARDY_FINAL_BETTING_DURATION_MS, JEOPARDY_FINAL_BETTING_DURATION_MS, {
            status: 'betting'
        })

        await this.scheduleTask(
            sessionId,
            'final.phase.betting.complete',
            {
                phase: 'betting',
                sessionId,
                type: 'jeopardy.final.phase.complete'
            },
            JEOPARDY_FINAL_BETTING_DURATION_MS,
            state
        )
    }

    private async beginFinalQuestionAnswering(state: StoredLobbyState): Promise<void> {
        const game = this.getGame(state)
        const session = this.getSession(state)
        const sessionId = this.getActiveLobbySessionId(state)

        if (!game || !session || !sessionId || session.frame.id !== 'final-round-board') {
            return
        }

        await this.cancelTask(sessionId, 'final.phase.betting.complete', state).catch(() => null)

        const themeIndex = session.frame.themes.findIndex(theme => !theme.skipped)
        const finalRoundIndex = getRoundsCount(game.packDeclaration) - 1
        const questionId = `${finalRoundIndex}-${themeIndex}-0` as RealtimeJeopardyQuestionId
        const question = getNormalizedQuestionById(game.packDeclaration, questionId)
        const answers = getJeopardyAnswers(game.packDeclaration, questionId)

        if (!question || !answers) {
            return
        }

        this.updateInternal(state, {
            correctAnswers: answers[0],
            incorrectAnswers: answers[1]
        })

        this.setFinalPhaseTimer(state, JEOPARDY_FINAL_ANSWERING_DURATION_MS, JEOPARDY_FINAL_ANSWERING_DURATION_MS, {
            questionAtoms: question.questionItems.map(atom => ({
                content: atom.content,
                isRef: atom.isRef,
                placement: atom.placement,
                type: atom.type
            })),
            skipperId: null,
            status: 'answering'
        })

        await this.scheduleTask(
            sessionId,
            'final.phase.answering.complete',
            {
                phase: 'answering',
                sessionId,
                type: 'jeopardy.final.phase.complete'
            },
            JEOPARDY_FINAL_ANSWERING_DURATION_MS,
            state
        )
    }

    private beginFinalQuestionVerifying(state: StoredLobbyState): void {
        const session = this.getSession(state)

        if (!session || session.frame.id !== 'final-round-board') {
            return
        }

        this.updateFrame(state, {
            ...session.frame,
            phaseEndsAt: null,
            phaseStartedAt: null,
            phaseTimeLeft: null,
            status: 'answer-verifying'
        })
    }

    private async showFinalScores(state: StoredLobbyState): Promise<void> {
        const session = this.getSession(state)

        if (!session) {
            return
        }

        const winner =
            this.getContestants(state).reduce(
                (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                null as StoredLobbyMember | null
            ) ||
            this.getContestants(state)[0] ||
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

        const getRemainingMs = (type: LobbyScheduledTaskPayload['type'], phase?: string) =>
            pausedTasks.find(task => task.payload.type === type && (!phase || ('phase' in task.payload && task.payload.phase === phase)))?.remainingMs || null

        session.meta.pausedTasks = []
        session.isPaused = false

        if (session.frame.id === 'question-content') {
            if (session.frame.specialPhase) {
                const phaseDurations: Record<string, number> = {
                    'choosing-price': JEOPARDY_SPECIAL_STAKE_DURATION_MS,
                    'making-hidden-stakes': JEOPARDY_SPECIAL_STAKE_DURATION_MS,
                    'making-stake': JEOPARDY_SPECIAL_STAKE_DURATION_MS,
                    'selecting-player': JEOPARDY_SPECIAL_PLAYER_SELECTION_DURATION_MS
                }
                const specialRemainingMs = getRemainingMs('jeopardy.phase.complete', session.frame.specialPhase)

                if (specialRemainingMs && phaseDurations[session.frame.specialPhase]) {
                    const timing = getPhaseTimingWindow(nowMs, phaseDurations[session.frame.specialPhase], specialRemainingMs)

                    session.frame.phaseStartedAt = timing.startedAt
                    session.frame.phaseEndsAt = timing.endsAt
                    session.frame.phaseTimeLeft = timing.timeLeft
                } else if (
                    (session.frame.specialPhase === 'showing-question' || session.frame.specialPhase === 'showing-answer') &&
                    getRemainingMs('jeopardy.question.atom.complete')
                ) {
                    const remainingMs = getRemainingMs('jeopardy.question.atom.complete') || 0
                    const totalMs =
                        session.frame.phaseStartedAt && session.frame.phaseEndsAt
                            ? Math.max(new Date(session.frame.phaseEndsAt).getTime() - new Date(session.frame.phaseStartedAt).getTime(), 0)
                            : JEOPARDY_CONTENT_DEFAULT_DURATION_MS
                    const timing = getPhaseTimingWindow(nowMs, totalMs, remainingMs)

                    session.frame.phaseStartedAt = timing.startedAt
                    session.frame.phaseEndsAt = timing.endsAt
                    session.frame.phaseTimeLeft = timing.timeLeft
                }
            }

            if (session.frame.answeringStatus === 'allowed') {
                const remainingMs = getRemainingMs('jeopardy.answer-request.complete')

                if (remainingMs) {
                    const phaseTiming = getPhaseTimingWindow(nowMs, JEOPARDY_ANSWER_REQUEST_DURATION_MS, remainingMs)

                    session.frame.answerRequestStartedAt = phaseTiming.startedAt
                    session.frame.answerRequestEndsAt = phaseTiming.endsAt
                    session.frame.answerRequestTimeLeft = phaseTiming.timeLeft
                }
            } else if (session.frame.answeringStatus === 'answering') {
                const remainingMs =
                    session.meta.currentQuestionFlow?.questionType === 'forAll' || session.meta.currentQuestionFlow?.questionType === 'stakeAll'
                        ? getRemainingMs('jeopardy.phase.complete', 'multi-answering')
                        : getRemainingMs('jeopardy.answer-giving.complete')
                const totalMs =
                    session.meta.currentQuestionFlow?.questionType === 'forAll' || session.meta.currentQuestionFlow?.questionType === 'stakeAll'
                        ? getQuestionAnswerDurationMs(
                              session.meta.currentQuestionFlow?.questionType,
                              session.meta.currentQuestionFlow?.answerDurationMs || null
                          )
                        : JEOPARDY_ANSWER_GIVING_DURATION_MS

                if (remainingMs) {
                    const phaseTiming = getPhaseTimingWindow(nowMs, totalMs, remainingMs)

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
        } else if (session.frame.id === 'final-round-board') {
            const phase =
                session.frame.status === 'skipping' || session.frame.status === 'betting' || session.frame.status === 'answering' ? session.frame.status : null
            const totalMs =
                phase === 'skipping'
                    ? JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS
                    : phase === 'betting'
                      ? JEOPARDY_FINAL_BETTING_DURATION_MS
                      : phase === 'answering'
                        ? JEOPARDY_FINAL_ANSWERING_DURATION_MS
                        : null
            const remainingMs = phase ? getRemainingMs('jeopardy.final.phase.complete', phase) : null

            if (phase && totalMs && remainingMs) {
                const timing = getPhaseTimingWindow(nowMs, totalMs, remainingMs)

                session.frame.phaseStartedAt = timing.startedAt
                session.frame.phaseEndsAt = timing.endsAt
                session.frame.phaseTimeLeft = timing.timeLeft
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

    private async handlePhaseCompleteTask(state: StoredLobbyState, sessionId: string, phase: string): Promise<ScheduledTaskResult> {
        const session = this.getSession(state)
        const flow = session?.meta.currentQuestionFlow

        if (!session || this.getActiveLobbySessionId(state) !== sessionId || session.frame.id !== 'question-content' || !flow) {
            return {
                stateChanged: false
            }
        }

        switch (phase) {
            case 'making-stake':
                flow.currentPrice = flow.priceOptions[0] || flow.currentPrice
                this.updateInternal(state, {
                    currentQuestionPrice: flow.currentPrice
                })
                await this.showNextQuestionAtom(state)
                return { stateChanged: true }
            case 'selecting-player': {
                const eligibleTargets = this.getEligibleSecretTargets(state, flow.selectionMode)
                const selectedPlayer =
                    eligibleTargets.reduce(
                        (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                        null as StoredLobbyMember | null
                    ) || null

                if (!selectedPlayer) {
                    return { stateChanged: false }
                }

                this.updateInternal(state, {
                    currentQuestionSelectedPlayerId: selectedPlayer.id
                })

                await this.continueSecretQuestionAfterSelection(state)

                return { stateChanged: true }
            }
            case 'choosing-price':
                flow.currentPrice = flow.priceOptions[0] || flow.currentPrice
                this.updateInternal(state, {
                    currentQuestionPrice: flow.currentPrice
                })

                if (flow.questionType === 'secretNoQuestion') {
                    await this.resolveSecretNoQuestion(state)
                } else {
                    await this.showNextQuestionAtom(state)
                }

                return { stateChanged: true }
            case 'making-hidden-stakes': {
                const eligiblePlayers = this.getContestants(state).filter(player => player.playerScore > 0)

                session.internal.currentQuestionBets = {
                    ...(session.internal.currentQuestionBets || {}),
                    ...Object.fromEntries(
                        eligiblePlayers
                            .filter(player => !session.internal.currentQuestionBets?.[player.id])
                            .map(player => [player.id, Math.min(player.playerScore, flow.currentPrice)])
                    )
                }

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatMadeBet: eligiblePlayers.map(player => player.id)
                })

                await this.showNextQuestionAtom(state)
                return { stateChanged: true }
            }
            case 'multi-answering':
                if (!Object.keys(session.internal.currentQuestionAnswers || {}).length) {
                    await this.continueQuestionAfterAnswerResolution(state, false)
                } else {
                    await this.beginAnswerVerifying(state, Object.keys(session.internal.currentQuestionAnswers || {}))
                }
                return { stateChanged: true }
            default:
                return {
                    stateChanged: false
                }
        }
    }

    private async handleFinalPhaseCompleteTask(
        state: StoredLobbyState,
        sessionId: string,
        phase: 'betting' | 'skipping' | 'answering'
    ): Promise<ScheduledTaskResult> {
        const session = this.getSession(state)

        if (!session || this.getActiveLobbySessionId(state) !== sessionId || session.frame.id !== 'final-round-board') {
            return {
                stateChanged: false
            }
        }

        switch (phase) {
            case 'skipping': {
                const remainingThemes = session.frame.themes.filter(theme => !theme.skipped)

                if (remainingThemes.length <= 1) {
                    await this.beginFinalRoundBetting(state)
                    return { stateChanged: true }
                }

                const theme = remainingThemes[0]

                if (!theme) {
                    return { stateChanged: false }
                }

                theme.skipped = true

                if (session.frame.themes.filter(item => !item.skipped).length === 1) {
                    await this.beginFinalRoundBetting(state)
                } else {
                    this.setFinalPhaseTimer(state, JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS, JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS, {
                        themes: [...session.frame.themes]
                    })
                    await this.scheduleTask(
                        sessionId,
                        'final.phase.skipping.complete',
                        {
                            phase: 'skipping',
                            sessionId,
                            type: 'jeopardy.final.phase.complete'
                        },
                        JEOPARDY_FINAL_THEME_SELECTION_DURATION_MS,
                        state
                    )
                }

                return { stateChanged: true }
            }
            case 'betting':
                for (const player of this.getContestants(state).filter(contestant => contestant.playerScore > 0)) {
                    if (!session.internal.finalBets[player.id]) {
                        session.internal.finalBets[player.id] = Math.min(player.playerScore, 1)
                    }
                }

                this.updateFrame(state, {
                    ...session.frame,
                    playersThatMadeBet: this.getContestants(state)
                        .filter(player => player.playerScore > 0)
                        .map(player => player.id)
                })
                await this.beginFinalQuestionAnswering(state)
                return { stateChanged: true }
            case 'answering':
                this.beginFinalQuestionVerifying(state)
                return { stateChanged: true }
            default:
                return {
                    stateChanged: false
                }
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
                JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS,
                state
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
                JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS,
                state
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

        const answeringPlayerId = state.game.session.frame.answeringPlayerId

        this.updateInternal(state, {
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: answeringPlayerId,
            currentQuestionAnswers: answeringPlayerId
                ? {
                      ...(state.game.session.internal.currentQuestionAnswers || {}),
                      [answeringPlayerId]: {
                          value: '',
                          wager: state.game.session.internal.currentQuestionBets?.[answeringPlayerId]
                      }
                  }
                : state.game.session.internal.currentQuestionAnswers,
            currentQuestionVerificationQueue: answeringPlayerId ? [answeringPlayerId] : []
        })

        await this.beginAnswerVerifying(state, answeringPlayerId ? [answeringPlayerId] : [])

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
        const remainingQueue = (session.internal.currentQuestionVerificationQueue || []).filter(playerId => playerId !== currentAnsweringPlayerId)

        if (currentAnsweringPlayerId) {
            this.applyQuestionAnswerRating(state, currentAnsweringPlayerId, 'declined')
        }

        if (remainingQueue.length) {
            await this.beginAnswerVerifying(state, remainingQueue)
        } else {
            this.updateInternal(state, {
                correctAnswers: null,
                currentAnsweringPlayerAnswerText: null,
                currentAnsweringPlayerId: null,
                currentQuestionVerificationQueue: [],
                incorrectAnswers: null
            })

            await this.continueQuestionAfterAnswerResolution(state, false)
        }

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
