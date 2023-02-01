import { LobbyMember } from 'state/lobby/LobbyMember'
import logger from 'logger'
import { TUser, User } from 'state/user/User'
import { Lobby } from 'state'

type AbstractSessionStartData = Record<string, string>

type GameAction = {
    type: string
    payload: any
}

export abstract class AbstractGameSession {
    game: AbstractGame
    log: GameAction[] = []
    abstract state: any

    constructor(game: AbstractGame) {
        this.game = game
    }

    action(type: keyof this & string, payload: any) {
        if (type in this) {
            const actionHandler = this[type]

            if (typeof actionHandler === 'function') {
                actionHandler(payload)

                this.log.push({ type, payload })
            }
        }

        logger.error({ payload }, `Handler for type '${type.toString()}' is missing`)
    }
}

export abstract class AbstractPlayer extends LobbyMember {
    score: number = 0

    constructor(lobby: Lobby, user: User) {
        super(lobby, user)
        this.isPlayer = true
    }
}

export type TAbstractPlayer = Omit<AbstractPlayer, 'user'> & {
    user: TUser
}

class ReadyCheck {
    playersForCheck: string[]
    readyPlayers: string[] = []
    game: AbstractGame
    isReady: boolean = false

    constructor(game: AbstractGame) {
        this.game = game
        this.playersForCheck = game.players.map(p => p.user.nickname)
    }

    playerReady(nickname: string) {
        if (this.playersForCheck.includes(nickname) && !this.readyPlayers.includes(nickname)) {
            this.readyPlayers.push(nickname)
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

    abstract startSession(data?: AbstractSessionStartData): void

    abstract onPlayerOffline(user: AbstractPlayer): void

    abstract toJSON(): any

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
}
