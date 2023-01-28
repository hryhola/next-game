import { action, makeAutoObservable } from 'mobx'
import { User } from './User'

export class UserRegistry {
    list: User[] = []

    get onlineUsers() {
        return this.list.filter(u => u.online)
    }

    constructor() {
        makeAutoObservable(this)
    }

    add(user: User, token: string) {
        this.list.push(user)
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
