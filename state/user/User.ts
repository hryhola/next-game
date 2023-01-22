import { makeAutoObservable } from 'mobx'
import { v4 } from 'uuid'

export class User {
    token: string
    online: boolean = true

    nickname: string
    avatarRes?: string

    constructor(id: string) {
        this.nickname = id
        this.token = v4()

        makeAutoObservable(this)
    }

    setAvatarRes(val: string) {
        this.avatarRes = val
    }

    setNickname(val: string) {
        this.nickname = val
    }

    setOnline(val: boolean) {
        this.online = val
    }

    isOnline() {
        return this.online
    }
}
