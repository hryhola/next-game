import { GameSession } from 'state/common/game/GameSession'
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
            playerIsClickAllowed: this.state.playerIsClickAllowed
        }
    }

    $Click(player: ClickerPlayer | Clicker, payload: { x: number; y: number }) {
        if (player instanceof Clicker) {
            return {
                error: 'Not allowed'
            } as const
        }

        if (!player.state.playerIsClickAllowed) {
            return {
                color: player.member.user.state.userColor,
                status: 'Skipped'
            } as const
        }

        if (!this.state.playerIsClickAllowed) {
            player.update({ playerIsClickAllowed: false })

            setTimeout(() => {
                if (this.game.currentSession === this) {
                    player.update({ playerIsClickAllowed: true })
                }
            }, 1000)

            return {
                color: player.member.user.state.userColor,
                status: 'Failure'
            } as const
        }

        if (this.state.winner) {
            return {
                color: player.member.user.state.userColor,
                status: 'NotWin'
            } as const
        }

        this.state.winner = player

        setTimeout(() => {
            if (this.game.currentSession === this) {
                player.update({ playerScore: player.state.playerScore + 1 })
                this.game.endSession()
            }
        }, 1000)

        return {
            color: player.member.user.state.userColor,
            status: 'Ok'
        } as const
    }

    $ClickAllowed() {
        this.state.playerIsClickAllowed = true

        return {
            playerIsClickAllowed: this.state.playerIsClickAllowed
        }
    }
}

export type ClickerSessionData = ReturnType<ClickerSession['data']>
