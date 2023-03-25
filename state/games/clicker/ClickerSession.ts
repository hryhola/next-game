import { GameSession, GameSessionAction, GameSessionActionsName } from 'state/common/game/GameSession'
import { Clicker } from './Clicker'
import { ClickerPlayer } from './ClickerPlayer'
import { ClickerSessionState } from './ClickerSessionState'
export class ClickerSession extends GameSession {
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

    $Click(player: ClickerPlayer | Clicker, payload: { x: number; y: number }) {
        if (player instanceof Clicker) {
            return {
                error: 'Not allowed'
            } as const
        }

        if (!player.state.isClickAllowed) {
            return {
                color: player.member.user.state.nicknameColor,
                status: 'Skipped'
            } as const
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
            } as const
        }

        if (this.state.winner) {
            return {
                color: player.member.user.state.nicknameColor,
                status: 'NotWin'
            } as const
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
        } as const
    }

    $ClickAllowed() {
        this.state.isClickAllowed = true

        return {
            isClickAllowed: this.state.isClickAllowed
        }
    }
}

export type ClickerSessionData = ReturnType<ClickerSession['data']>
