import { LobbyMember } from 'state/lobby/LobbyMember'
import logger from 'logger'
import { Lobby } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/t'

type AbstractSessionStartData = Record<string, string>

export type GameAction = {
    type: string
    payload: any
    result: any
    by: string
}

export abstract class AbstractGameSession {
    game: AbstractGame
    log: GameAction[] = []

    abstract state: any

    constructor(game: AbstractGame) {
        this.game = game
    }

    action(by: AbstractPlayer | AbstractGame, type: string, payload: any): GeneralSuccess | GeneralFailure {
        if (!type) {
            const message = 'Action type is missing'

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        const handlerName = '$' + type

        if (!(handlerName in this)) {
            const message = `Handler for type '${type.toString()}' is missing`

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        const actionHandler = this[handlerName as keyof this]

        if (typeof actionHandler !== 'function') {
            const message = `Handler for type '${type.toString()}' is missing`

            logger.error({ payload })

            return {
                success: false,
                message
            }
        }

        const result = actionHandler.call(this, by, payload)

        const action = { type, payload, result, by: by instanceof AbstractGame ? '#game' : by.member.user.state.nickname }

        this.log.push(action)

        this.game.lobby.publish('Game-SessionAction', {
            ...action,
            lobbyId: this.game.lobby.id
        })

        return {
            success: true
        }
    }

    data() {
        return {
            winner: null
        }
    }
}

export abstract class AbstractPlayer {
    member: LobbyMember

    state = {
        score: 0,
        isMaster: false
    }

    constructor(member: LobbyMember) {
        this.member = member

        if (member.state.isCreator) {
            this.state.isMaster = true
        }

        member.update({ isPlayer: true })
    }

    update(newState: Partial<typeof this.state>) {
        this.state = {
            ...this.state,
            ...newState
        }

        this.member.lobby.publish('Clicker-Update', {
            updated: {
                players: this.member.lobby.game.players.map(p => p.data())
            }
        })
    }

    data() {
        return {
            ...this.member.data(),
            ...this.state
        }
    }
}

export type AbstractPlayerData = ReturnType<AbstractPlayer['data']>

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
            state: this.currentSession?.state
        }
    }
}

export type AbstractGameData = ReturnType<AbstractGame['data']>
