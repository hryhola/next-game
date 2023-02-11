import { EventEmitter } from 'node:events'
import { WebSocket } from 'uWebSockets.js'
import randomColor from 'randomcolor'
import { v4 } from 'uuid'
import { Lobby } from 'state'

type onUpdateCb = (user: Partial<User['state']>) => void

export class User {
    static readonly AutoLogoutMs = 5000

    private readonly emitter: EventEmitter
    private logoutInterval: NodeJS.Timeout
    private lobbies: Lobby[] = []

    readonly ws: WebSocket<unknown>

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

        this.logoutInterval = setTimeout(() => {
            this.update({ isOnline: false })
        }, User.AutoLogoutMs)
    }

    refreshOnlineChecker() {
        clearTimeout(this.logoutInterval)

        this.logoutInterval = setTimeout(() => {
            this.update({ isOnline: false })
        }, User.AutoLogoutMs)
    }

    update(data: Partial<User['state']>) {
        Object.assign(this.state, data)

        this.emitter.emit('update', data)
    }

    onUpdate(callback: onUpdateCb) {
        this.emitter.on('update', callback)
    }

    linkLobby(lobby: Lobby) {
        this.lobbies.push(lobby)
    }

    leaveAllLobbies() {
        this.lobbies.forEach(l => l.leave(this))

        this.lobbies = []
    }

    data() {
        return this.state
    }
}

export type UserData = ReturnType<User['data']>
