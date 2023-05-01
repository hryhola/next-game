import { Game } from 'state/common/game/Game'
import { GameOnlyActed } from 'state/common/game/GameSession.decorators'
import { A, E, P, GameSession, GameSessionActionHandlerEventOptions, GameSessionActionsName } from 'state/common/game/GameSession'
import { Player } from 'state/common/game/Player'
import { Chronos, TimeHall } from 'util/chronos'
import { GeneralSuccess, GeneralFailure, R } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState } from './JeopardySessionState'
import { shuffle } from 'util/array'

export class JeopardySession extends GameSession {
    readonly state: JeopardySessionState

    timeHall: TimeHall

    game!: Jeopardy

    constructor(game: Jeopardy) {
        super(game)

        this.state = {
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
        return this.state
    }

    start() {
        this.game.publish('Game-SessionStart', {
            lobbyId: this.game.lobby.id,
            session: this.data()
        })

        this.actionSequence([
            [this.game, '$ThemesPreview', null],
            [this.game, '$RoundPreview', null],
            [this.game, '$PickQuestion', {}]
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
    $PickQuestion(actor: A, payload: { round: number; playerID: string }, { complete }: E): R {
        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    $RoundPreview(actor: A, payload: P, { complete }: E): R {
        this.timeHall.createAndStartEvent('RoundPreview', 5, complete)

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
