import { TUser, User } from 'state'

export class LobbyMember {
    user: User
    isCreator: boolean = false
    isPlayer?: boolean

    constructor(user: User) {
        this.user = user
    }
}

export type TLobbyMember = Omit<LobbyMember, 'user'> & {
    user: TUser
}
