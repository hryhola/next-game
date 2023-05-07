import logger from 'logger'
import { random, shuffle } from 'util/array'
import { Chronos, TimeHall } from 'util/chronos'
import { Game } from 'state/common/game/Game'
import { GameOnlyActed } from 'state/common/game/GameSession.decorators'
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
                answeredQuestions: []
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

    @GameOnlyActed
    $AwaitAnswer(actor: A, payload: P, { complete }: E): R {
        if (this.state.frame.id !== 'question-content') {
            return {
                success: false,
                message: 'Cannot wait answer for non question-content frame'
            }
        }

        const answerPossibilityDuration = 5

        this.timeHall.createAndStartEvent('AwaitAnswer', answerPossibilityDuration, complete)

        return {
            success: true
        }
    }

    showAtom(atom: JeopardyDeclaration.QuestionScenarioContentAtom, beforeMarker: boolean) {
        const frame: JeopardyState.QuestionContentFrame = {
            id: 'question-content',
            content: atom._text,
            type: atom._attributes?.type || 'text',
            answeringStatus: beforeMarker ? 'too-early' : 'too-late',
            answerProgress: null
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
                await this.showAtom(atom, true)
            }

            await this.act('$AwaitAnswer', null)

            for (const atom of contentAfterAnswer) {
                await this.showAtom(atom, false)
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

        if (this.state.frame.pickerId !== actor.member.user.id) {
            complete()
            return {
                success: false,
                message: `Only user with ID ${this.state.frame.pickerId} can pick question!`
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
