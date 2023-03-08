import { EventEmitter } from 'node:events'
import { WebSocket } from 'uWebSockets.js'
import randomColor from 'randomcolor'
import { v4 } from 'uuid'
import { Lobby } from 'state'

type onUpdateCb = (user: Partial<User['state']>) => void

export class User {
    static readonly AutoLogoutMs = 5000

    private readonly emitter: EventEmitter
    private logoutTimeout: NodeJS.Timeout
    private lobbies: Lobby[] = []

    ws: WebSocket<unknown>

    readonly token: string
    readonly id: string

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
        this.id = v4()

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

    update(newData: Partial<User['state']>) {
        Object.assign(this.state, newData)

        this.lobbies.forEach(l => {
            l.publish('Lobby-MemberUpdate', {
                lobbyId: l.id,
                memberId: this.id,
                data: newData
            })

            const isPlayer = l.game.players.some(p => p.member.user === this)

            if (isPlayer) {
                l.publish('Game-PlayerUpdate', {
                    id: this.id,
                    data: newData
                })
            }
        })

        this.emitter.emit('update', newData)
    }

    onUpdate(callback: onUpdateCb) {
        this.emitter.on('update', callback)
    }

    linkLobby(lobby: Lobby) {
        this.lobbies.push(lobby)
    }

    unlinkLobby(lobby: Lobby) {
        this.lobbies = this.lobbies.filter(l => l !== lobby)
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
        return {
            ...this.state,
            id: this.id
        }
    }
}

export type UserData = ReturnType<User['data']>
