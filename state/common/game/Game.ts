import logger from 'logger'
import { Lobby, LobbyMember, GameSession, SessionStartData, Player } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/t'

export abstract class Game {
    static gameName: string

    abstract currentSession?: GameSession

    prevSessions: GameSession[] = []
    lobby: Lobby
    publish: Lobby['publish']

    constructor(lobby: Lobby) {
        this.lobby = lobby
        this.publish = lobby.publish.bind(lobby)
    }

    abstract players: Player[]

    abstract join(user: LobbyMember): void

    abstract startSession(data?: SessionStartData): GeneralSuccess | GeneralFailure

    leave(player: Player) {
        this.players = this.players.filter(p => p !== player)

        this.publish('Game-Leave', {
            lobbyId: this.lobby.id,
            player: player.data()
        })
    }

    endSession() {
        if (!this.currentSession) {
            logger.warn('Cannot end session that is not started')
            return
        }

        this.publish('Game-SessionEnd', {
            lobbyId: this.lobby.id,
            session: this.currentSession.data(),
            players: this.players.map(p => p.data())
        })

        this.prevSessions.push(this.currentSession)

        delete this.currentSession
    }

    data() {
        return {
            name: (this.constructor as typeof Game).gameName,
            players: this.players.map(p => p.data()),
            session: this.currentSession?.data()
        }
    }
}

export type GameData = ReturnType<Game['data']>
