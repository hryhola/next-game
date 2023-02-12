import { AbstractGame, LobbyMember } from 'state'
import { ClickerPlayer } from './ClickerPlayer'
import { ClickerSession } from './ClickerSession'

export class Clicker extends AbstractGame {
    static gameName = 'Clicker'

    players: ClickerPlayer[] = []

    join(member: LobbyMember) {
        const player = new ClickerPlayer(member)

        this.players.push(player)

        this.publish('Clicker-Join', {
            success: true,
            lobbyId: this.lobby.id,
            player: player.data()
        })

        return {
            success: true
        }
    }

    leave(player: ClickerPlayer) {
        this.players = this.players.filter(p => p !== player)

        this.publish('Clicker-Leave', {
            success: true,
            lobbyId: this.lobby.id,
            player: player.data()
        })
    }

    startSession() {
        this.currentSession = new ClickerSession(this)
    }
}
