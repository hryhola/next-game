import { makeObservable, observable } from 'mobx'
import { Lobby, TUser, User } from 'state'
import { reactions } from './LobbyMember.reactions'

export class LobbyMember {
    user: User
    isCreator: boolean = false
    isPlayer: boolean
    lobby: Lobby

    constructor(lobby: Lobby, user: User) {
        this.user = user
        this.lobby = lobby
        this.isPlayer = false

        makeObservable(this, {
            user: observable,
            isCreator: observable,
            isPlayer: observable
        })

        reactions(this)
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
