import { makeAutoObservable } from 'mobx'
import { Chat } from 'state/global/Chat'
import { User } from 'state/user/User'
import { LobbyMember } from './LobbyMember'

export class Lobby {
    id: string
    users: LobbyMember[] = []
    creatorID: string
    password?: string
    chat: Chat = new Chat()

    constructor(id: string, creator: User, password?: string) {
        this.id = id
        this.password = password
        this.creatorID = creator.nickname

        const creatorMember = new LobbyMember(creator)

        creatorMember.isCreator = true

        this.users.push(creatorMember)

        makeAutoObservable(this)
    }
}
