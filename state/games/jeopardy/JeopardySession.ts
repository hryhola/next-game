import { Game } from 'state/common/game/Game'
import { GameOnlyActed } from 'state/common/game/GameSession.decorators'
import { A, E, P, GameSession, GameSessionActionHandlerEventOptions, GameSessionActionsName } from 'state/common/game/GameSession'
import { Player } from 'state/common/game/Player'
import { Chronos, TimeHall } from 'util/chronos'
import { GeneralSuccess, GeneralFailure, R } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState, JeopardyState } from './JeopardySessionState'
import { random, shuffle } from 'util/array'
import { JeopardyPlayer } from './JeopardyPlayer'

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

    data() {
        const { internal, ...state } = this.state

        return state
    }

    start() {
        this.game.publish('Game-SessionStart', {
            lobbyId: this.game.lobby.id,
            session: this.data()
        })

        this.actionSequence([
            [this.game, '$PackPreview', null],
            [this.game, '$RoundPreview', { roundId: 0 }],
            // TODO random(this.game.answeringPlayers).data().id
            [this.game, '$ShowQuestionBoard', { roundId: 0, playerId: random(this.game.players).data().id }]
        ])
    }

    async actionSequence(actionData: [Parameters<this['action']>[0], Parameters<this['action']>[1], Parameters<this['action']>[2]][]) {
        for (const [actor, action, payload] of actionData) {
            await new Promise(resolve => {
                this.action(actor, action, payload, { complete: () => resolve(null) })
            })
        }
    }

    @GameOnlyActed
    $ShowQuestion(actor: A, payload: { questionId: `${number}-${number}-${number}` }, { complete }: E): R {
        complete()
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
            this.update({
                frame: {
                    ...this.state.frame,
                    pickedQuestion: undefined
                } as Partial<JeopardyState.ShowQuestionBoardFrame>
            })

            complete()

            this.action(this.game, '$ShowQuestion', { questionId: payload.questionId }, { complete: () => {} })
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
    $PackPreview(actor: A, payload: P, { complete }: E): R {
        this.timeHall.createAndStartEvent('PackPreview', 10, complete)

        const themes = shuffle(this.game.pack.getNonFinalThemes())

        this.update({
            frame: {
                id: 'pack-preview',
                packName: this.game.pack.declaration.package._attributes.name,
                author: this.game.pack.declaration.package._attributes.name,
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
