import { LobbyMember } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { ClickerPlayer } from './ClickerPlayer'
import { ClickerSession } from './ClickerSession'
import { Game } from 'state/common/game/Game'
import { ClickerInitialData, clickerInitialDataSchema } from './ClickerInitialData'

function randomInteger(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export class Clicker extends Game {
    static gameName = 'Clicker'

    static initialDataSchema = clickerInitialDataSchema

    initialData!: ClickerInitialData

    currentSession?: ClickerSession

    players: ClickerPlayer[] = []

    join(member: LobbyMember): GeneralSuccess | GeneralFailure {
        const player = new ClickerPlayer(member)

        if (member.state.isCreator) {
            player.update({ isMaster: true })
        }

        this.players.push(player)

        this.publish('Game-Join', {
            lobbyId: this.lobby.id,
            player: player.data()
        })

        return {
            success: true
        }
    }

    startSession(): GeneralSuccess | GeneralFailure {
        if (this.currentSession) {
            return {
                success: false,
                message: 'Session already in progress'
            }
        }

        this.currentSession = new ClickerSession(this)

        setTimeout(() => {
            if (this.currentSession) {
                this.currentSession.action(this, '$ClickAllowed', {})
            }
        }, randomInteger(500, 3000))

        this.publish('Game-SessionStart', {
            lobbyId: this.lobby.id,
            session: this.currentSession.data()
        })

        return {
            success: true
        }
    }
}
