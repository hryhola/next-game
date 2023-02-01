import { TUser, User } from 'state'

export class LobbyMember {
    user: User
    isCreator: boolean = false
    isPlayer?: boolean

    constructor(user: User) {
        this.user = user
    }

    toJSON() {
        return {
            user: this.user.toJSON(),
            isCreator: this.isCreator,
            isPlayer: this.isPlayer
        }
    }
}

export type TLobbyMember = Omit<LobbyMember, 'user'> & {
    user: TUser
}
