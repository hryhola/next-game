import { state } from 'state'
import { v4 } from 'uuid'

export class User {
    private token?: string
    private online: boolean = true

    nickname: string
    avatarRes?: string

    constructor(id: string) {
        this.nickname = id
        this.token = v4()

        state.auth[this.token] = this
    }

    setOnline(val: boolean) {
        this.online = val
    }

    isOnline() {
        return this.online
    }

    getToken() {
        return this.token!
    }

    destroyToken() {
        delete state.auth[this.token!]
        delete this.token
    }
}

export type TUser = ExcludeMethods<User>
