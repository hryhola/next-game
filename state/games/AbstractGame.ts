import { LobbyMember } from 'state/lobby/LobbyMember'
import logger from 'logger'
import { User } from 'state/user/User'
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

        this.game.lobby.publish({
            ctx: gameClass + '-SessionAction',
            data: {
                type,
                payload,
                result
            }
        })
    }
}

export abstract class AbstractPlayer {
    member: LobbyMember

    state = {
        score: 0
    }

    constructor(member: LobbyMember) {
        this.member = member
    }

    data() {
        return {
            ...this.member.data(),
            ...this.state
        }
    }
}

export type AbstractPlayerData = ReturnType<AbstractPlayer['data']>

class ReadyCheck {
    playersForCheck: AbstractPlayer[]
    readyPlayers: AbstractPlayer[] = []
    game: AbstractGame
    isReady: boolean = false

    constructor(game: AbstractGame) {
        this.game = game
        this.playersForCheck = game.players
    }

    playerReady(player: AbstractPlayer) {
        if (this.playersForCheck.includes(player) && !this.readyPlayers.includes(player)) {
            this.readyPlayers.push(player)
        }

        if (this.playersForCheck.length === this.readyPlayers.length) {
            this.isReady = true
        }
    }
}

export abstract class AbstractGame {
    static gameName: string

    currentSession?: AbstractGameSession

    prevSessions: AbstractGameSession[] = []
    lobby: Lobby

    constructor(lobby: Lobby) {
        this.lobby = lobby
    }

    abstract players: AbstractPlayer[]

    abstract join(user: LobbyMember): void

    abstract leave(user: AbstractPlayer): void

    abstract startSession(data?: AbstractSessionStartData): void

    readyCheck?: ReadyCheck

    endSession() {
        if (!this.currentSession) {
            logger.warn('Cannot end session that is not started')
            return
        }

        this.prevSessions.push(this.currentSession)

        delete this.currentSession
    }

    startReadyCheck() {
        this.readyCheck = new ReadyCheck(this)
    }

    data() {
        return {
            players: this.players.map(p => p.data()),
            state: this.currentSession?.state
        }
    }
}

export type AbstractGameData = ReturnType<AbstractGame['data']>
