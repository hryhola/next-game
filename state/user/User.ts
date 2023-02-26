import { EventEmitter } from 'node:events'
import { WebSocket } from 'uWebSockets.js'
import randomColor from 'randomcolor'
import { v4 } from 'uuid'
import { AbstractGame, Lobby } from 'state'

type onUpdateCb = (user: Partial<User['state']>) => void

export class User {
    static readonly AutoLogoutMs = 5000

    private readonly emitter: EventEmitter
    private logoutTimeout: NodeJS.Timeout
    private lobbies: Lobby[] = []

    ws: WebSocket<unknown>

    readonly token: string

    readonly state: {
        readonly nickname: string
        readonly nicknameColor: string
        readonly avatarUrl?: string
        readonly isOnline: boolean
    }

    constructor(id: string, ws: WebSocket<unknown>) {
        this.emitter = new EventEmitter()
        this.ws = ws
        this.token = v4()
        this.state = {
            nickname: id,
            nicknameColor: randomColor(),
            isOnline: true
        }

        this.logoutTimeout = setTimeout(() => {
            this.update({ isOnline: false })
        }, User.AutoLogoutMs)
    }

    refreshOnlineChecker() {
        clearTimeout(this.logoutTimeout)

        if (!this.state.isOnline) {
            this.update({ isOnline: true })
        }

        this.logoutTimeout = setTimeout(() => {
            this.update({ isOnline: false })
        }, User.AutoLogoutMs)
    }

    update(data: Partial<User['state']>) {
        Object.assign(this.state, data)

        this.lobbies.forEach(l => {
            l.publish('Lobby-Update', {
                lobbyId: l.id,
                updated: {
                    members: l.members.map(m => m.data())
                }
            })

            l.game.publish(`${(l.game.constructor as typeof AbstractGame).gameName}-Update`, {
                updated: {
                    players: l.game.players.map(p => p.data())
                }
            })
        })

        this.emitter.emit('update', data)
    }

    onUpdate(callback: onUpdateCb) {
        this.emitter.on('update', callback)
    }

    linkLobby(lobby: Lobby) {
        this.lobbies.push(lobby)
    }

    unlinkLobby(lobby: Lobby) {
        this.lobbies = []
        // this.lobbies = this.lobbies.filter(l => l !== lobby)
    }

    leaveAllLobbies() {
        this.lobbies.forEach(l => l.leave(this))

        this.lobbies = []
    }

    get hasLobbies() {
        return this.lobbies.length > 0
    }

    get lobby() {
        return this.lobbies[0]
    }

    data() {
        return this.state
    }
}

export type UserData = ReturnType<User['data']>
