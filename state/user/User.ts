import { makeAutoObservable } from 'mobx'
import randomColor from 'randomcolor'
import { v4 } from 'uuid'

export class User {
    token: string
    online: boolean = true

    nickname: string
    nicknameColor: string
    avatarRes?: string

    constructor(id: string) {
        this.nickname = id
        this.token = v4()
        this.nicknameColor = randomColor({ format: 'rgb' })

        makeAutoObservable(this)
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
