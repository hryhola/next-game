import logger from 'logger'
import { Lobby, LobbyMember, AbstractGameSession, AbstractSessionStartData, AbstractPlayer } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/t'

export abstract class AbstractGame {
    static gameName: string

    abstract currentSession?: AbstractGameSession

    prevSessions: AbstractGameSession[] = []
    lobby: Lobby
    publish: Lobby['publish']

    constructor(lobby: Lobby) {
        this.lobby = lobby
        this.publish = lobby.publish.bind(lobby)
    }

    abstract players: AbstractPlayer[]

    abstract join(user: LobbyMember): void

    abstract leave(user: AbstractPlayer): void

    abstract startSession(data?: AbstractSessionStartData): GeneralSuccess | GeneralFailure

    endSession() {
        if (!this.currentSession) {
            logger.warn('Cannot end session that is not started')
            return
        }

        this.publish('Game-SessionEnd', {
            lobbyId: this.lobby.id,
            state: this.currentSession.data(),
            players: this.players.map(p => p.data())
        })

        this.prevSessions.push(this.currentSession)

        delete this.currentSession
    }

    data() {
        return {
            name: (this.constructor as typeof AbstractGame).gameName,
            players: this.players.map(p => p.data()),
            state: this.currentSession?.data()
        }
    }
}

export type AbstractGameData = ReturnType<AbstractGame['data']>
