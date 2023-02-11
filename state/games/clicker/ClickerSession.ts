import { AbstractGameSession } from 'state'
import { ClickerPlayer } from './ClickerPlayer'
import { ClickerSessionState } from './ClickerSessionState'

export class ClickerSession extends AbstractGameSession {
    state = new ClickerSessionState()

    Click({ player }: { player: ClickerPlayer }) {
        if (this.state.winner) {
            return {
                status: 'Failure'
            }
        }

        this.state.winner = player

        this.game.endSession()

        return {
            status: 'Ok'
        }
    }
}
