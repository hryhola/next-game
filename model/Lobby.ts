import { Chat } from './Chat'
import { User } from './User'

export class LobbyMember extends User {
    isCreator: boolean = false
    isMaster: boolean = false
}

export class Lobby {
    id: string
    users: LobbyMember[] = []
    password?: string
    chat: Chat = new Chat()

    constructor(id: string, creator: User, password?: string) {
        this.id = id
        this.password = password

        const creatorMember = new LobbyMember(creator.id)

        creatorMember.isCreator = true
        creatorMember.isMaster = true

        this.users.push(creatorMember)
    }
}

export type TLobbyMember = ExcludeMethods<LobbyMember>
