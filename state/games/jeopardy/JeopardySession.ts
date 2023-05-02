import { Game } from 'state/common/game/Game'
import { GameOnlyActed } from 'state/common/game/GameSession.decorators'
import { A, E, P, GameSession, GameSessionActionHandlerEventOptions, GameSessionActionsName } from 'state/common/game/GameSession'
import { Player } from 'state/common/game/Player'
import { Chronos, TimeHall } from 'util/chronos'
import { GeneralSuccess, GeneralFailure, R } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState, JeopardyState } from './JeopardySessionState'
import { random, shuffle } from 'util/array'

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
            [this.game, '$ThemesPreview', null],
            [this.game, '$RoundPreview', { roundId: 0 }],
            // TODO random(this.game.answeringPlayers).data().id
            [this.game, '$PickQuestion', { roundId: 0, playerId: random(this.game.players).data().id }]
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
    $PickQuestion(actor: A, payload: { roundId: number; playerId: string }, { complete }: E): R {
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
                id: 'pick-question',
                pickerId: payload.playerId,
                roundId: payload.roundId,
                themes: currentThemesData
            } as JeopardyState.PickQuestionFrame
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
        const roundThemesPreviewDuration = data.themeNames.length * themesDisplayDuration

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

        this.timeHall.createAndStartEvent('RoundPreviewEnd', roundNamePreviewDuration + roundThemesPreviewDuration, complete)

        return {
            success: true
        }
    }

    @GameOnlyActed
    $ThemesPreview(actor: A, payload: P, { complete }: E): R {
        this.timeHall.createAndStartEvent('ThemesPreview', 10, complete)

        const themes = shuffle(this.game.pack.getNonFinalThemes())

        this.update({
            frame: {
                id: 'pack-themes-preview',
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
