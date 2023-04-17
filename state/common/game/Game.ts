import logger from 'logger'
import { Lobby, LobbyMember, GameSession, Player } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { InitialGameData, InitialGameDataSchema } from './GameInitialData'

export abstract class Game {
    static gameName: string

    static initialDataSchema?: InitialGameDataSchema

    initialData: InitialGameData

    state?: any

    prevSessions: GameSession[] = []

    lobby: Lobby

    abstract currentSession?: GameSession

    constructor(lobby: Lobby, initialGameData?: InitialGameData) {
        this.lobby = lobby
        this.initialData = initialGameData || {}
        this.publish = lobby.publish.bind(lobby)
    }

    publish: Lobby['publish']

    async postConstructor() {}

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
        const publicInitialData = Object.entries(this.initialData).reduce((acc, [key, value]) => {
            if (value.public) {
                acc[key] = {
                    public: true,
                    value: value.value
                }
            }

            return acc
        }, {} as InitialGameData)

        return {
            name: (this.constructor as typeof Game).gameName,
            players: this.players.map(p => p.data()),
            session: this.currentSession?.data(),
            initialData: publicInitialData
        }
    }
}

export type GameData = ReturnType<Game['data']>
