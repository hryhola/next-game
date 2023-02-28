import { LobbyMember } from 'state/lobby/LobbyMember'
import logger from 'logger'
import { Lobby } from 'state'

type AbstractSessionStartData = Record<string, string>

type GameAction = {
    type: string
    payload: any
    result: any
}

export abstract class AbstractGameSession {
    game: AbstractGame
    log: GameAction[] = []
    abstract state: any

    constructor(game: AbstractGame) {
        this.game = game
    }

    action(type: keyof this & string, payload: any) {
        if (type === 'action' || !(type in this)) {
            logger.error({ payload }, `Handler for type '${type.toString()}' is missing`)
            return
        }

        const actionHandler = this[type]

        if (typeof actionHandler !== 'function') {
            logger.error({ payload }, `Handler for type '${type.toString()}' is missing`)

            return
        }

        const result = actionHandler(payload)

        this.log.push({ type, payload, result })

        const gameClass = (this.game.constructor as typeof AbstractGame).gameName

        this.game.lobby.publish(gameClass + '-SessionAction', {
            type,
            payload,
            result
        })
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

    currentSession?: AbstractGameSession

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

    abstract startSession(data?: AbstractSessionStartData): void

    endSession() {
        if (!this.currentSession) {
            logger.warn('Cannot end session that is not started')
            return
        }

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
