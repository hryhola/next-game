import logger from 'logger'
import { random, shuffle } from 'util/array'
import { Chronos, TimeHall } from 'util/chronos'
import { Game } from 'state/common/game/Game'
import { GameOnlyActed, PlayersOnlyActed } from 'state/common/game/GameSession.decorators'
import { A, E, P, GameSession, GameSessionActionHandlerEventOptions, GameSessionActionsName, GameSessionAction } from 'state/common/game/GameSession'
import { Player } from 'state/common/game/Player'
import { GeneralSuccess, GeneralFailure, R } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState, JeopardyState } from './JeopardySessionState'
import { JeopardyPlayer } from './JeopardyPlayer'
import { JeopardyDeclaration } from './JeopardyPack.types'

export class JeopardySession extends GameSession {
    readonly state: JeopardySessionState

    timeHall: TimeHall

    game!: Jeopardy

    constructor(game: Jeopardy) {
        super(game)

        this.state = {
            internal: {
                answeredQuestions: [],
                currentRoundId: 0
            },
            frame: {
                id: 'none'
            }
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

    data() {
        const { internal, ...state } = this.state

        return state
    }

    start() {
        this.game.publish('Game-SessionStart', {
            lobbyId: this.game.lobby.id,
            session: this.data()
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
                if (frame.answeringStatus !== 'allowed') {
                    this.timeHall.resolveEvent('QuestionAtom')
                    return
                }

                for (let i = 100; i >= 0; i--) {
                    this.timeHall.cancelEvent('AwaitAnswerProgress' + i)
                }

                this.timeHall.resolveEvent('AwaitAnswer')

                return
            }
            default: {
                return
            }
        }
    }

    @PlayersOnlyActed
    $AnswerRequest(actor: JeopardyPlayer, payload: P, { complete }: E) {
        const { frame: currFrame } = this.state

        if (currFrame.id !== 'question-content') {
            complete()
            return {
                success: false,
                message: 'Answering not allowed on non question-content frame'
            }
        }

        if (currFrame.answerCooldownPlayerIds.includes(actor.member.user.id)) {
            complete()
            return {
                success: false,
                message: `Player ${actor.member.user.state.userNickname} is on cooldown!`
            }
        }

        const frame = { ...currFrame }

        const answerCooldown = 2

        if (currFrame.answeringStatus !== 'allowed') {
            frame.answerCooldownPlayerIds.push(actor.member.user.id)

            this.timeHall.createAndStartEvent('Cooldown-' + actor.member.user.id, answerCooldown, () => {
                if (this.state.frame.id !== 'question-content') return

                const _frame = { ...this.state.frame }

                _frame.answerCooldownPlayerIds = _frame.answerCooldownPlayerIds.filter(i => i !== actor.member.user.id)

                this.update({ frame: _frame })
            })

            this.update({ frame })

            complete()

            return {
                success: true,
                isPlayerOnCooldown: true
            }
        }

        if (!currFrame.answeringPlayerId) {
            frame.answeringPlayerId = actor.member.user.id
            frame.answeringStatus = 'too-late'
        } else {
            logger.warn('This code should be unreachable! If we have answeringPlayerId, then answeringStatus should be not-allowed')

            frame.answerCooldownPlayerIds.push(actor.member.user.id)
        }

        this.update({ frame })

        complete()

        return {
            success: true
        }
    }

    @PlayersOnlyActed
    $SkipVote(actor: JeopardyPlayer, payload: P, { complete }: E): R {
        if (actor.state.playerIsMaster) {
            this.skip()

            complete()

            return {
                success: true
            }
        }

        if (!actor.state.playerIsMaster && this.state.frame.id !== 'question-content') {
            complete()
            return {
                success: false,
                message: 'Cannot wait skip question for non question-content frame'
            }
        }

        const { id: userId } = actor.member.user

        const currFrame = this.state.frame as JeopardyState.QuestionContentFrame

        if (currFrame.skipVoted.includes(userId)) {
            complete()
            return {
                success: false,
                message: 'You already voted!'
            }
        }

        const frame: JeopardyState.QuestionContentFrame = {
            ...currFrame,
            skipVoted: [...currFrame.skipVoted, userId]
        }

        this.update({ frame })

        if (frame.skipVoted.length === this.game.answeringPlayers.length) {
            this.skip()
        }

        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    $AwaitAnswer(actor: A, payload: P, { complete }: E): R {
        if (this.state.frame.id !== 'question-content') {
            return {
                success: false,
                message: 'Cannot wait answer for non question-content frame'
            }
        }

        const answerPossibilityDuration = 5

        for (let i = 100; i >= 0; i--) {
            this.timeHall.createAndStartEvent('AwaitAnswerProgress' + i, (100 - i) * (answerPossibilityDuration / 100), () => {
                const frame: JeopardyState.QuestionContentFrame = {
                    ...(this.state.frame as JeopardyState.QuestionContentFrame),
                    answeringStatus: 'allowed',
                    answerProgress: i
                }

                this.update({
                    frame
                })
            })
        }

        this.timeHall.createAndStartEvent('AwaitAnswer', answerPossibilityDuration, () => {
            const frame: JeopardyState.QuestionContentFrame = {
                ...(this.state.frame as JeopardyState.QuestionContentFrame),
                answeringStatus: 'too-late',
                answerProgress: 0
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
            answerProgress: null,
            skipVoted: [],
            answerCooldownPlayerIds: currFrame.answerCooldownPlayerIds || []
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

            await this.act('$AwaitAnswer', null)

            for (const atom of contentAfterAnswer) {
                await this.showAtom(payload.questionId, atom, false)
            }

            this.state.internal.answeredQuestions.push(payload.questionId)

            this.act('$ShowQuestionBoard', { roundId: 0, playerId: random(this.game.players).data().id })

            complete()
        })()

        return {
            success: true
        }
    }

    $PickQuestion(actor: A, payload: { questionId: `${number}-${number}-${number}` }, { complete }: E): R {
        if (!(actor instanceof JeopardyPlayer)) {
            complete()
            return {
                success: false,
                message: 'Only JeopardyPlayer can pick question'
            }
        }

        if (this.state.frame.id !== 'question-board') {
            complete()
            return {
                success: false,
                message: 'Cannot pick question during non question-board frame'
            }
        }

        if (!actor.state.playerIsMaster && this.state.frame.pickerId !== actor.member.user.id) {
            complete()
            return {
                success: false,
                message: `Only user with ID ${this.state.frame.pickerId} or master can pick question!`
            }
        }

        if (this.state.frame.pickedQuestion) {
            return {
                success: false,
                message: `Already picked a question! (${this.state.frame.pickedQuestion})`
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

        this.update({
            frame: {
                ...this.state.frame,
                pickedQuestion: payload.questionId
            } as Partial<JeopardyState.ShowQuestionBoardFrame>
        })

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
}

export type JeopardySessionData = ReturnType<JeopardySession['data']>
