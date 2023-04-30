import { LobbyMember, Player } from 'state'

interface ClickerPlayerState {
    readonly playerIsClickAllowed: boolean
}

export class ClickerPlayer extends Player<ClickerPlayerState> {
    constructor(member: LobbyMember) {
        super(member)

        Object.assign(this.state, {
            playerIsClickAllowed: true
        } as ClickerPlayerState)
    }
}

export type ClickerPlayerData = ReturnType<ClickerPlayer['data']>
