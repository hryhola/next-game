import { User } from 'state'

export class LobbyMember {
    user: User
    isCreator: boolean = false

    constructor(user: User) {
        this.user = user
    }
}
