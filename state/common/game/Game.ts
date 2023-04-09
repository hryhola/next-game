import logger from 'logger'
import { Lobby, LobbyMember, GameSession, Player } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { InitialGameData, InitialGameDataSchema } from './GameInitialData'

export abstract class Game {
    static gameName: string

    static initialDataSchema?: InitialGameDataSchema

    initialData?: InitialGameData

    abstract currentSession?: GameSession

    prevSessions: GameSession[] = []
    lobby: Lobby
    publish: Lobby['publish']

    constructor(lobby: Lobby) {
        this.lobby = lobby
        this.publish = lobby.publish.bind(lobby)
    }

    abstract players: Player[]

    abstract join(user: LobbyMember): GeneralSuccess | GeneralFailure

    abstract startSession(): GeneralSuccess | GeneralFailure

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
            session: this.currentSession?.data(),
            initialData: this.initialData
        }
    }
}

export type GameData = ReturnType<Game['data']>
