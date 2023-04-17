import { Game, LobbyMember } from 'state'
import { GeneralSuccess, GeneralFailure } from 'util/universalTypes'
import { JeopardyInitialData, jeopardyInitialDataSchema } from './JeopardyInitialData'
import { JeopardyPlayer } from './JeopardyPlayer'
import { JeopardySession } from './JeopardySession'

export class Jeopardy extends Game {
    static gameName = 'Jeopardy'

    static initialDataSchema = jeopardyInitialDataSchema

    initialData!: JeopardyInitialData

    currentSession?: JeopardySession

    players: JeopardyPlayer[] = []

    join(member: LobbyMember): GeneralSuccess | GeneralFailure {
        const player = new JeopardyPlayer(member)

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

        this.currentSession = new JeopardySession(this)

        this.publish('Game-SessionStart', {
            lobbyId: this.lobby.id,
            session: this.currentSession.data()
        })

        return {
            success: true
        }
    }
}
