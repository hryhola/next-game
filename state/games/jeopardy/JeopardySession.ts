import { Game } from 'state/common/game/Game'
import { GameOnlyActed } from 'state/common/game/GameSession.decorators'
import { A, E, P, GameSession, GameSessionActionHandlerEventOptions, GameSessionActionsName } from 'state/common/game/GameSession'
import { Player } from 'state/common/game/Player'
import { Chronos, TimeHall } from 'util/chronos'
import { GeneralSuccess, GeneralFailure } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState } from './JeopardySessionState'

export class JeopardySession extends GameSession {
    state: JeopardySessionState
    timeHall: TimeHall

    constructor(game: Jeopardy) {
        super(game)

        this.state = new JeopardySessionState()

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
        return {}
    }

    start() {
        this.action(this.game, '$PickQuestion', { playerID: '1', round: 1 }, { complete: () => null })

        this.game.publish('Game-SessionStart', {
            lobbyId: this.game.lobby.id,
            session: this.data()
        })

        this.actionSequence([
            [this.game, '$AllThemesPreview', null],
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
    $PickQuestion(actor: A, payload: { round: number; playerID: string }, { complete }: E) {
        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    $RoundPreview(actor: A, payload: P, { complete }: E) {
        this.timeHall.createAndStartEvent('RoundPreview', 5, complete)

        return {
            success: true
        }
    }

    @GameOnlyActed
    $AllThemesPreview(actor: A, payload: P, { complete }: E) {
        this.timeHall.createAndStartEvent('AllThemesPreview', 5, complete)

        return {
            success: true
        }
    }
}

export type ClickerSessionData = ReturnType<JeopardySession['data']>
