import { makeAutoObservable } from 'mobx'
import randomColor from 'randomcolor'
import { reactions } from './User.reactions'
import { Lobby } from 'state/lobby/Lobby'
import { v4 } from 'uuid'
import { WebSocket } from 'uWebSockets.js'

export class User {
    ws: WebSocket<unknown>
    token: string
    online: boolean = true

    nickname: string
    nicknameColor: string
    avatarRes?: string
    lobbies: Lobby[] = []

    refreshOnlineChecker: () => void

    constructor(id: string, ws: WebSocket<unknown>) {
        this.ws = ws
        this.nickname = id
        this.token = v4()
        this.nicknameColor = randomColor()

        let logoutInterval = setTimeout(() => this.setOnline(false), 5000)

        this.refreshOnlineChecker = () => {
            clearTimeout(logoutInterval)

            logoutInterval = setTimeout(() => this.setOnline(false), 5000)
        }

        makeAutoObservable(this)

        reactions(this)
    }

    setAvatarRes(val: string) {
        this.avatarRes = val
    }

    setNickname(val: string) {
        this.nickname = val
    }

    setNicknameColor(val: string) {
        this.nicknameColor = val
    }

    setOnline(val: boolean) {
        this.online = val
    }

    isOnline() {
        return this.online
    }
}

export type TUser = Pick<User, 'nickname' | 'avatarRes' | 'nicknameColor'>
