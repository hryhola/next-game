import { makeAutoObservable } from 'mobx'
import { User } from './User'
import { reactions } from './UserRegistry.reactions'
import { WebSocket } from 'uWebSockets.js'

export class UserRegistry {
    list: User[] = []

    get onlineUsers() {
        return this.list.filter(u => u.online)
    }

    constructor() {
        makeAutoObservable(this)

        reactions(this)
    }

    createUser(nickname: string, ws: WebSocket<unknown>) {
        const user = new User(nickname, ws)

        this.list.push(user)

        return user
    }

    auth(token: string) {
        return this.list.find(u => u.token === token)
    }

    getByNickname(nickname: string) {
        return this.list.find(u => u.nickname === nickname)
    }

    destroy(token: string) {
        const user = this.auth(token)

        if (user) {
            this.list = this.list.filter(u => u !== user)
        }
    }
}
