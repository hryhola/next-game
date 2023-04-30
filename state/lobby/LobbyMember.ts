import logger from 'logger'
import { Lobby, LobbyMemberRole, User } from 'state'

export class LobbyMember {
    readonly user: User
    readonly lobby: Lobby

    readonly state: {
        readonly memberIsCreator: boolean
        readonly memberIsPlayer: boolean
        readonly memberPosition: number
        readonly memberRole: LobbyMemberRole
    }

    constructor(lobby: Lobby, user: User) {
        this.user = user
        this.lobby = lobby
        this.state = {
            memberIsCreator: lobby.creator === user,
            memberPosition: lobby.members.length,
            get memberIsPlayer() {
                return lobby.game.players.some(p => p.member.user === user)
            },
            get memberRole() {
                return lobby.game.players.some(p => p.member.user === user) ? 'player' : 'spectator'
            }
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
