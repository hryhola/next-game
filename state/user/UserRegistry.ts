import { action, makeAutoObservable } from 'mobx'
import { User } from './User'

export class UserRegistry {
    readonly tokenMap: Record<string, User> = {}

    readonly list: User[] = []

    get onlineUsers() {
        return this.list.filter(u => u.online)
    }

    constructor() {
        makeAutoObservable(this)
    }

    @action
    add(user: User, token: string) {
        this.list.push(user)
        this.tokenMap[token] = user
    }

    auth(token: string) {
        return this.tokenMap[token]
    }

    getByNickname(nickname: string) {
        return this.list.find(u => u.nickname === nickname)
    }

    destroy(token: string) {
        delete this.tokenMap[token]
    }
}
