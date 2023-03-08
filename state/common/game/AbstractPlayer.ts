import { LobbyMember } from 'state'

export abstract class AbstractPlayer {
    member: LobbyMember

    state = {
        score: 0,
        isMaster: false
    }

    constructor(member: LobbyMember) {
        this.member = member

        if (member.state.isCreator) {
            this.state.isMaster = true
        }

        member.update({ isPlayer: true })
    }

    update(newState: Partial<typeof this.state>) {
        this.state = {
            ...this.state,
            ...newState
        }

        this.member.lobby.publish('Game-Update', {
            updated: {
                players: this.member.lobby.game.players.map(p => p.data())
            }
        })
    }

    data() {
        return {
            ...this.member.data(),
            ...this.state
        }
    }
}

export type AbstractPlayerData = ReturnType<AbstractPlayer['data']>
