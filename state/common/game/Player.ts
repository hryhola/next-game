import { LobbyMember } from 'state'

interface PlayerState {
    readonly playerScore: number
    readonly playerIsMaster: boolean
}

export abstract class Player<ExtendedState extends {} = {}> {
    member: LobbyMember

    readonly state: PlayerState & ExtendedState

    constructor(member: LobbyMember) {
        this.member = member

        this.state = {
            playerScore: 0,
            playerIsMaster: member.state.memberIsCreator
        } as PlayerState & ExtendedState
    }

    update(newState: Partial<typeof this.state>) {
        Object.assign(this.state, newState)

        this.member.lobby.publish('Game-PlayerUpdate', {
            id: this.member.user.id,
            data: newState
        })
    }

    data() {
        return {
            ...this.member.data(),
            ...this.state
        }
    }
}

export type PlayerData = ReturnType<Player['data']>
