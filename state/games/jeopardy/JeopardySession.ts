import { GameOnlyActed } from 'state/common/game/Game.decorators'
import { A, E, P, GameSession } from 'state/common/game/GameSession'
import { Chronos, TimeHall } from 'util/chronos'
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

    data() {
        return {}
    }

    start() {
        this.game.publish('Game-SessionStart', {
            lobbyId: this.game.lobby.id,
            session: this.data()
        })

        this.actionSequence([
            [this.game, '$CategoriesPreview', null],
            [this.game, '$ThemePreview', null],
            [this.game, '$PickQuestion', { category: 0 }]
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
    $PickQuestion(actor: A, payload: P, { complete }: E) {
        complete()

        return {
            success: true
        }
    }

    @GameOnlyActed
    $ThemePreview(actor: A, payload: P, { complete }: E) {
        this.timeHall.createAndStartEvent('ThemePreview', 5, complete)

        return {
            success: true
        }
    }

    @GameOnlyActed
    $CategoriesPreview(actor: A, payload: P, { complete }: E) {
        this.timeHall.createAndStartEvent('CategoriesPreview', 5, complete)

        return {
            success: true
        }
    }
}

export type ClickerSessionData = ReturnType<JeopardySession['data']>
