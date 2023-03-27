import logger from 'logger'
import { Lobby, LobbyMemberRole, User } from 'state'

export class LobbyMember {
    readonly user: User
    readonly lobby: Lobby

    readonly state: {
        isCreator: boolean
        isPlayer: boolean
        position: number
        role: LobbyMemberRole
    }

    constructor(lobby: Lobby, user: User) {
        this.user = user
        this.lobby = lobby
        this.state = {
            isCreator: lobby.creator === user,
            isPlayer: false,
            position: lobby.members.length,
            get role() {
                return lobby.game.players.some(p => p.member.user === user) ? 'player' : 'spectator'
            },
            set role(_value: LobbyMemberRole) {
                logger.error('Cannot set role directly')
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
