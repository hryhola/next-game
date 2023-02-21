import { Lobby, User } from 'state'

export class LobbyMember {
    readonly user: User
    readonly lobby: Lobby

    readonly state: {
        isCreator: boolean
        isPlayer: boolean
    }

    constructor(lobby: Lobby, user: User) {
        this.user = user
        this.lobby = lobby
        this.state = {
            isCreator: lobby.creator === user,
            isPlayer: false
        }
    }

    update(data: Partial<LobbyMember['state']>) {
        Object.assign(this.state, data)
    }

    data() {
        return {
            ...this.user.data(),
            ...this.state
        }
    }
}

export type LobbyMemberData = ReturnType<LobbyMember['data']>
