import { Lobby, LobbyMember } from 'state'

export class ReadyCheck {
    membersForCheck: LobbyMember[]
    readyMembers: LobbyMember[] = []
    lobby: Lobby

    constructor(lobby: Lobby) {
        this.lobby = lobby
        this.membersForCheck = [...lobby.members]

        lobby.publish('ReadyCheck-Start', {})
    }

    playerReady(member: LobbyMember) {
        if (this.membersForCheck.includes(member) && !this.readyMembers.includes(member)) {
            this.readyMembers.push(member)

            this.lobby.publish('ReadyCheck-PlayerReady', {
                playerId: member.user.state.nickname
            })
        }

        if (this.membersForCheck.length === this.readyMembers.length) {
            this.lobby.publish('ReadyCheck-Ready', {})

            delete this.lobby.readyCheck
        }
    }
}
