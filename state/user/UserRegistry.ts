import { action, makeAutoObservable } from 'mobx'
import { User } from './User'
import { reactions } from './UserRegistry.reactions'

export class UserRegistry {
    list: User[] = []

    get onlineUsers() {
        return this.list.filter(u => u.online)
    }

    constructor() {
        makeAutoObservable(this)

        reactions(this)
    }

    add(user: User) {
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
