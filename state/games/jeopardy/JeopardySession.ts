import logger from 'logger'
import { random, shuffle } from 'util/array'
import { Chronos, TimeHall } from 'util/chronos'
import { Game } from 'state/common/game/Game'
import { GameOnlyActed, NonPublished, MasterOnlyActed, PlayersOnlyActed, PublishedForMasterOnly, ActedBy } from 'state/common/game/GameSession.decorators'
import { A, E, P, GameSession, GameSessionActionHandlerEventOptions, GameSessionActionsName, GameSessionAction } from 'state/common/game/GameSession'
import { Player } from 'state/common/game/Player'
import { GeneralSuccess, GeneralFailure, R, RecursivePartial } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState, JeopardyState } from './JeopardySessionState'
import { JeopardyPlayer } from './JeopardyPlayer'
import { JeopardyDeclaration } from './JeopardyPack.types'
import { User } from 'state/user/User'
import { ActedByPlayers, OnFrame } from './JeopardySession.decorators'
import { Events } from 'state/common/game/Game.events'

export class JeopardySession extends GameSession<JeopardySessionState> {
    readonly state: JeopardySessionState

    timeHall: TimeHall

    game!: Jeopardy

    constructor(game: Jeopardy) {
        super(game)

        this.state = {
            internal: {
                answeredQuestions: [],
                currentRoundId: 0,
                currentAnsweringPlayerId: null,
                currentAnsweringPlayerAnswerText: null
            },
            frame: {
                id: 'none'
            },
            isPaused: false
        }

        this.timeHall = Chronos.createTimeHall()
    }

    action<T extends GameSessionActionsName<JeopardySession>>(
        actor: Game | Player,
        type: T,
        payload: Parameters<this[T]>[1],
        eventOptions: GameSessionActionHandlerEventOptions
    ): GeneralSuccess | GeneralFailure {
        return super.action(actor, String(type), payload, eventOptions)
    }

    act<N extends GameSessionActionsName<JeopardySession>>(type: N, payload: Parameters<this[N]>[1]) {
        return new Promise(res => {
            this.action(this.game, type, payload, { complete: () => res(null) })
        })
    }

    data(user: User | Game): JeopardySessionState | Omit<JeopardySessionState, 'internal'> {
        if (this.state.frame.id === 'question-content' && (this.state.frame.type === 'video' || this.state.frame.type === 'voice')) {
            const elapsedMediaTimeMs = this.timeHall.get('QuestionAtom')?.currentElapsedTimeMs

            if (typeof elapsedMediaTimeMs === 'number') {
                this.state.frame.elapsedMediaTimeMs = elapsedMediaTimeMs
            }
        }

        if (user instanceof User && this.game.players.some(p => p.member.user === user && p.state.playerIsMaster)) {
            return this.state
        }

        const { internal, ...state } = this.state

        return state
    }

    updateInternal(internal: RecursivePartial<this['state']['internal']>) {
        this.state.internal = {
            ...this.state.internal,
            ...internal
        }

        const master = this.game.players.find(p => p.state.playerIsMaster)

        if (!master) {
            logger.error("There is no Jeopardy master! Can't send internal session update message")
            return
        }

        const sessionData: Partial<JeopardySession['state']> = {
            internal: this.state.internal
        }

        const data: Events['Game-SessionUpdate'] & {
            data: Partial<JeopardySession['state']>
        } = {
            lobbyId: this.game.lobby.id,
            data: sessionData
        }

        master.member.user.ws.send(
            JSON.stringify({
                ctx: 'Game-SessionUpdate',
                data
            })
        )
    }

    start() {
        this.game.publish('Game-SessionStart', {
            lobbyId: this.game.lobby.id,
            session: this.data(this.game)
        })
        ;(async () => {
            await this.act('$PackPreview', null)
            await this.act('$RoundPreview', { roundId: 0 })
            await this.act('$ShowQuestionBoard', { roundId: 0, playerId: random(this.game.players).data().id })
        })()
    }

    skip() {
        const { frame } = this.state

        switch (frame.id) {
            case 'pack-preview': {
                this.timeHall.resolveEvent('PackPreview')
                return
            }
            case 'rounds-preview': {
                const themesCount = this.game.pack.getRoundThemesCount(this.state.internal.currentRoundId)

                if (!themesCount) {
                    logger.error('Cannot get themesCount on round preview skip!')
                    return
                }

                for (let i = 0; i < themesCount; i++) {
                    this.timeHall.cancelEvent('RoundThemeNamePreview' + i)
                }

                this.timeHall.resolveEvent('RoundPreviewEnd')

                return
            }
            case 'question-content': {
                switch (frame.answeringStatus) {
                    case 'allowed':
                        for (let i = 100; i >= 0; i--) this.timeHall.cancelEvent('AwaitAnswerRequestProgress' + i)

                        this.timeHall.resolveEvent('AwaitAnswerRequest')
                        return
                    case 'answering':
                        for (let i = 100; i >= 0; i--) this.timeHall.cancelEvent('AnswerGivingProgress' + i)

                        this.timeHall.resolveEvent('AnswerGiving')
                        return
                    case 'answer-verifying':
                        for (let i = 100; i >= 0; i--) this.timeHall.cancelEvent('AnswerVerifyingProgress' + i)

                        this.timeHall.resolveEvent('AnswerVerifying')
                        return
                    case 'too-early':
                    case 'too-late':
                        this.timeHall.resolveEvent('QuestionAtom')
                    default:
                        return
                }
            }
            default: {
                return
            }
        }
    }

    pauseAwaitAnswerRequest() {
        for (let i = 100; i >= 0; i--) {
            this.timeHall.pauseIfRunning('AwaitAnswerRequestProgress' + i)
        }

        this.timeHall.pauseIfRunning('AwaitAnswerRequest')
    }

    resumeAwaitAnswerRequest() {
        for (let i = 100; i >= 0; i--) {
            this.timeHall.resumeEventIfPaused('AwaitAnswerRequestProgress' + i)
        }

        this.timeHall.resumeEventIfPaused('AwaitAnswerRequest')
    }

    resolveAwaitAnswerRequest() {
        for (let i = 100; i >= 0; i--) {
            this.timeHall.cancelEvent('AwaitAnswerRequestProgress' + i)
        }

        this.timeHall.resolveEvent('AwaitAnswerRequest')
    }

    resolveAnswerGiving() {
        for (let i = 100; i >= 0; i--) {
            this.timeHall.cancelEvent('AnswerGivingProgress' + i)
        }

        this.timeHall.resolveEvent('AnswerGiving')
    }

    @NonPublished
    @OnFrame(
        'question-content',
        ({ state }) =>
            (actor: JeopardyPlayer) =>
                state.frame.answeringPlayerId === actor.member.user.id,
        'Not your turn!'
    )
    $GiveAnswer(actor: JeopardyPlayer, payload: { text?: string }, { complete }: E): R {
        this.state.internal.currentAnsweringPlayerAnswerText = payload.text
        this.state.internal.currentAnsweringPlayerId = actor.member.user.id

        this.resolveAnswerGiving()

        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    @OnFrame('question-content', session => () => session.state.internal.currentAnsweringPlayerId !== null)
    @PublishedForMasterOnly
    $AnswerVerifying(actor: A, payload: P, { complete }: E) {
        const frame = this.state.frame as JeopardyState.QuestionContentFrame

        const answers = this.game.pack.getAnswers(frame.questionId)

        if (!answers) {
            return {
                success: false,
                message: `Cannot find such question! ${frame.questionId}`
            }
        }

        this.updateInternal({
            correctAnswers: answers[0],
            incorrectAnswers: answers[1]
        })

        const verifyingDuration = 10

        for (let i = 100; i >= 0; i--)
            this.timeHall.createAndStartEvent('AnswerVerifyingProgress' + i, (100 - i) * (verifyingDuration / 100), () => {
                const frame: JeopardyState.QuestionContentFrame = {
                    ...(this.state.frame as JeopardyState.QuestionContentFrame),
                    answeringStatus: 'answer-verifying',
                    answerVerifyingTimeLeft: i
                }

                this.update({
                    frame
                })
            })

        this.timeHall.createAndStartEvent('AnswerVerifying', verifyingDuration, async () => {
            this.updateInternal({
                correctAnswers: null,
                incorrectAnswers: null,
                currentAnsweringPlayerId: null,
                currentAnsweringPlayerAnswerText: null
            })

            complete()
        })

        return {
            success: true
        }
    }

    @PlayersOnlyActed
    @OnFrame(
        'question-content',
        ({ state }) =>
            (actor: JeopardyPlayer) =>
                !state.frame.playersOnCooldown.includes(actor.member.user.id) && !state.frame.playersWhoAnswered.includes(actor.member.user.id)
    )
    $AnswerRequest(actor: JeopardyPlayer, payload: P, { complete }: E) {
        const currFrame = this.state.frame as JeopardyState.QuestionContentFrame

        const frame = { ...currFrame }

        const answerCooldown = 2

        if (currFrame.answeringStatus !== 'allowed') {
            frame.playersOnCooldown.push(actor.member.user.id)

            this.timeHall.createAndStartEvent('Cooldown-' + actor.member.user.id, answerCooldown, () => {
                if (this.state.frame.id !== 'question-content') return

                const _frame = { ...this.state.frame }

                _frame.playersOnCooldown = _frame.playersOnCooldown.filter(i => i !== actor.member.user.id)

                this.update({ frame: _frame })
            })

            this.update({ frame })

            complete()

            return {
                success: true,
                isPlayerOnCooldown: true
            }
        }

        if (currFrame.answeringPlayerId) {
            logger.warn('This code should be unreachable! If we have answeringPlayerId, then answeringStatus should be not-allowed')

            frame.playersOnCooldown.push(actor.member.user.id)

            this.update({ frame })

            complete()

            return {
                success: true
            }
        }

        frame.answeringPlayerId = actor.member.user.id
        frame.answeringStatus = 'answering'
        frame.answerGivingTimeLeft = 100
        frame.playersWhoAnswered.push(actor.member.user.id)

        this.pauseAwaitAnswerRequest()

        this.update({ frame })

        const answeringDuration = 10

        for (let i = 100; i >= 0; i--) {
            this.timeHall.createAndStartEvent('AnswerGivingProgress' + i, (100 - i) * (answeringDuration / 100), () => {
                const _frame: JeopardyState.QuestionContentFrame = {
                    ...(this.state.frame as JeopardyState.QuestionContentFrame),
                    answeringStatus: 'answering',
                    answerGivingTimeLeft: i
                }

                this.update({
                    frame: _frame
                })
            })
        }

        this.timeHall.createAndStartEvent('AnswerGiving', answeringDuration, async () => {
            const frame: JeopardyState.QuestionContentFrame = {
                ...(this.state.frame as JeopardyState.QuestionContentFrame),
                answeringPlayerId: null
            }

            this.update({ frame })

            await this.act('$AnswerVerifying', null)

            if (this.state.internal.answerIsApproved) {
                this.resolveAwaitAnswerRequest()
            } else {
                this.resumeAwaitAnswerRequest()
            }

            complete()
        })

        return {
            success: true
        }
    }

    // TODO: Skip by players voting
    @MasterOnlyActed
    $SkipVote(actor: JeopardyPlayer, payload: P, { complete }: E): R {
        this.skip()

        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    @OnFrame('question-content')
    $AwaitAnswerRequest(actor: A, payload: P, { complete }: E): R {
        const answerPossibilityDuration = 5

        for (let i = 100; i >= 0; i--) {
            this.timeHall.createAndStartEvent('AwaitAnswerRequestProgress' + i, (100 - i) * (answerPossibilityDuration / 100), () => {
                const frame: JeopardyState.QuestionContentFrame = {
                    ...(this.state.frame as JeopardyState.QuestionContentFrame),
                    answeringStatus: i === 0 ? 'too-late' : 'allowed',
                    answerRequestTimeLeft: i
                }

                this.update({
                    frame
                })
            })
        }

        this.timeHall.createAndStartEvent('AwaitAnswerRequest', answerPossibilityDuration, () => {
            const frame: JeopardyState.QuestionContentFrame = {
                ...(this.state.frame as JeopardyState.QuestionContentFrame),
                answeringStatus: 'too-late',
                answerRequestTimeLeft: null
            }

            this.update({
                frame
            })

            complete()
        })

        return {
            success: true
        }
    }

    showAtom(questionId: `${number}-${number}-${number}`, atom: JeopardyDeclaration.QuestionScenarioContentAtom, beforeMarker: boolean) {
        const currFrame = this.state.frame as JeopardyState.QuestionContentFrame

        const frame: JeopardyState.QuestionContentFrame = {
            ...currFrame,
            questionId,
            id: 'question-content',
            content: atom._text,
            type: atom._attributes?.type || 'text',
            answeringStatus: beforeMarker ? 'too-early' : 'too-late',
            answerRequestTimeLeft: null,
            answerGivingTimeLeft: null,
            elapsedMediaTimeMs: undefined,
            skipVoted: [],
            playersOnCooldown: currFrame.playersOnCooldown || [],
            playersWhoAnswered: currFrame.playersWhoAnswered || []
        }

        if (beforeMarker) {
            frame.answeringPlayerId = null

            this.updateInternal({
                answerIsApproved: null,
                correctAnswers: null,
                incorrectAnswers: null,
                currentAnsweringPlayerAnswerText: null,
                currentAnsweringPlayerId: null
            })
        }

        let contentDuration = 5

        if (frame.type === 'video' || frame.type === 'voice') {
            let prefix = frame.type === 'video' ? 'Video' : 'Audio'

            const mediaDuration = this.game.pack.mediaDurationMap[`${prefix}/${frame.content.slice(1)}`]

            if (mediaDuration) {
                contentDuration = mediaDuration
            } else {
                contentDuration = 10
                logger.error(frame, `Cannot get media duration for media!`)
            }
        }

        this.update({
            frame
        })

        return this.timeHall.createAndStartEvent('QuestionAtom', contentDuration).completion
    }

    @GameOnlyActed
    $ShowQuestionContent(actor: A, payload: { questionId: `${number}-${number}-${number}` }, { complete }: E): R {
        const scenario = this.game.pack.getQuestionScenarioById(payload.questionId)

        if (!scenario) {
            complete()
            return {
                success: false,
                message: 'Question do not exist'
            }
        }

        const [contentBeforeAnswer, contentAfterAnswer] = scenario

        ;(async () => {
            for (const atom of contentBeforeAnswer) {
                await this.showAtom(payload.questionId, atom, true)
            }

            await this.act('$AwaitAnswerRequest', null)

            for (const atom of contentAfterAnswer) {
                await this.showAtom(payload.questionId, atom, false)
            }

            const answeredQuestions = [...this.state.internal.answeredQuestions, payload.questionId]

            this.updateInternal({
                answeredQuestions
            })

            this.act('$ShowQuestionBoard', { roundId: 0, playerId: random(this.game.players).data().id })

            complete()
        })()

        return {
            success: true
        }
    }

    @PlayersOnlyActed
    @OnFrame('question-board', session => (actor: JeopardyPlayer) => actor.state.playerIsMaster || session.state.frame.pickerId === actor.member.user.id)
    $PickQuestion(actor: JeopardyPlayer, payload: { questionId: `${number}-${number}-${number}` }, { complete }: E): R {
        const currFrame = this.state.frame as JeopardyState.ShowQuestionBoardFrame

        if (currFrame.pickedQuestion) {
            return {
                success: false,
                message: `Already picked a question! (${currFrame.pickedQuestion})`
            }
        }

        const question = this.game.pack.getQuestionById(payload.questionId)

        if (!question) {
            return {
                success: false,
                message: `Cannot find question with ID ${payload.questionId} !`
            }
        }

        if (this.state.internal.answeredQuestions.includes(payload.questionId)) {
            return {
                success: false,
                message: `Question with ID ${payload.questionId} have been answered already!`
            }
        }

        const frame = {
            ...currFrame,
            pickedQuestion: payload.questionId
        }

        this.update({ frame })

        this.timeHall.createAndStartEvent('PickQuestion', 1, () => {
            complete()

            this.act('$ShowQuestionContent', { questionId: payload.questionId })
        })

        return {
            success: true
        }
    }

    @GameOnlyActed
    $ShowQuestionBoard(actor: A, payload: { roundId: number; playerId: string }, { complete }: E): R {
        const player = this.game.players.find(p => p.member.user.id === payload.playerId)

        if (!player) {
            complete()
            return {
                success: false,
                message: `Cannot find player with ID ${payload.playerId}`
            }
        }

        const themesDeclaration = this.game.pack.getRoundQuestionViewData(payload.roundId)

        if (!themesDeclaration) {
            complete()
            return {
                success: false,
                message: `Cannot find round with ID ${payload.roundId}`
            }
        }

        const currentThemesData = themesDeclaration.map(t => ({
            ...t,
            question: t.question.map(q => ({
                ...q,
                isAnswered: this.state.internal.answeredQuestions.includes(q.questionId)
            }))
        }))

        this.update({
            frame: {
                id: 'question-board',
                pickerId: payload.playerId,
                roundId: payload.roundId,
                themes: currentThemesData
            } as JeopardyState.ShowQuestionBoardFrame
        })

        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    $RoundPreview(actor: A, payload: { roundId: number }, { complete }: E): R {
        const data = this.game.pack.getRoundThemeNames(payload.roundId)

        if (!data) {
            complete()
            return {
                success: false,
                message: `Cannot find round with ID ${payload.roundId}`
            }
        }

        this.update({
            frame: {
                id: 'rounds-preview',
                isRoundName: true,
                text: data.roundName
            }
        })

        const roundNamePreviewDuration = 2
        const themesDisplayDuration = 2
        const roundPackPreviewDuration = data.themeNames.length * themesDisplayDuration

        data.themeNames.forEach((themeName, i) => {
            this.timeHall.createAndStartEvent('RoundThemeNamePreview' + i, themesDisplayDuration * (i + 1), () => {
                this.update({
                    frame: {
                        id: 'rounds-preview',
                        isRoundName: false,
                        text: themeName
                    }
                })
            })
        })

        this.timeHall.createAndStartEvent('RoundPreviewEnd', roundNamePreviewDuration + roundPackPreviewDuration, complete)

        return {
            success: true
        }
    }

    @GameOnlyActed
    $PackPreview(actor: A, payload: null, { complete }: E): R {
        this.timeHall.createAndStartEvent('PackPreview', 10, complete)

        const themes = shuffle(this.game.pack.getNonFinalThemes())

        this.update({
            frame: {
                id: 'pack-preview',
                packName: this.game.pack.declaration.package._attributes.name,
                author: this.game.pack.declaration.package.info.authors.author._text,
                dateCreated: this.game.pack.declaration.package._attributes.date,
                themes
            }
        })

        return {
            success: true
        }
    }

    @MasterOnlyActed
    $Pause(actor: A, payload: null, { complete }: E): R {
        this.timeHall.pause()

        this.update({ isPaused: true })

        complete()
        return {
            success: true
        }
    }

    @MasterOnlyActed
    $Resume(actor: A, payload: null, { complete }: E): R {
        this.timeHall.resume()

        this.update({ isPaused: false })

        complete()

        return {
            success: true
        }
    }
}

export type JeopardySessionData = ReturnType<JeopardySession['data']>
