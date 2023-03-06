import { AbstractGameSession, Clicker } from 'state'
import { ClickerPlayer } from './ClickerPlayer'
import { ClickerSessionState } from './ClickerSessionState'
export class ClickerSession extends AbstractGameSession {
    _state: ClickerSessionState

    constructor(game: Clicker) {
        super(game)

        this._state = new ClickerSessionState()
    }

    Click(player: ClickerPlayer | Clicker) {
        if (player instanceof Clicker) {
            return {
                error: 'Not allowed'
            }
        }

        if (!this._state.isClickAllowed) {
            return {
                color: player.member.user.state.nicknameColor,
                status: 'Failure'
            }
        }

        if (this._state.winner) {
            return {
                color: player.member.user.state.nicknameColor,
                status: 'Failure'
            }
        }

        this._state.winner = player

        setTimeout(() => {
            if (this._game.currentSession === this) {
                player.update({ score: player.state.score + 1 })
                this._game.endSession()
            }
        }, 1000)

        return {
            color: player.member.user.state.nicknameColor,
            status: 'Ok'
        }
    }

    ClickAllowed() {
        this._state.isClickAllowed = true

        return {
            isClickAllowed: this._state.isClickAllowed
        }
    }
}
