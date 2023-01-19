import { Chat } from './Chat'
import { User } from './User'

export class LobbyMember extends User {
    isCreator: boolean = false
}

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

        const creatorMember = new LobbyMember(creator.nickname)

        creatorMember.isCreator = true

        this.users.push(creatorMember)
    }
}

export type TLobbyMember = ExcludeMethods<LobbyMember>
