import { AbstractGameSession } from 'state/common/game/AbstractGameSession'
import { Clicker } from './Clicker'
import { ClickerPlayer } from './ClickerPlayer'
import { ClickerSessionState } from './ClickerSessionState'
export class ClickerSession extends AbstractGameSession {
    state: ClickerSessionState

    constructor(game: Clicker) {
        super(game)

        this.state = new ClickerSessionState()
    }

    data() {
        return {
            winner: this.state.winner?.data(),
            isClickAllowed: this.state.isClickAllowed
        }
    }

    $Click(player: ClickerPlayer | Clicker) {
        if (player instanceof Clicker) {
            return {
                error: 'Not allowed'
            }
        }

        if (!player.state.isClickAllowed) {
            return {
                color: player.member.user.state.nicknameColor,
                status: 'Skipped'
            }
        }

        if (!this.state.isClickAllowed) {
            player.update({ isClickAllowed: false })

            setTimeout(() => {
                if (this.game.currentSession === this) {
                    player.update({ isClickAllowed: true })
                }
            }, 1000)

            return {
                color: player.member.user.state.nicknameColor,
                status: 'Failure'
            }
        }

        if (this.state.winner) {
            return {
                color: player.member.user.state.nicknameColor,
                status: 'Failure'
            }
        }

        this.state.winner = player

        setTimeout(() => {
            if (this.game.currentSession === this) {
                player.update({ score: player.state.score + 1 })
                this.game.endSession()
            }
        }, 1000)

        return {
            color: player.member.user.state.nicknameColor,
            status: 'Ok'
        }
    }

    $ClickAllowed() {
        this.state.isClickAllowed = true

        return {
            isClickAllowed: this.state.isClickAllowed
        }
    }
}
