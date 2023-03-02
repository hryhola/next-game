import { Lobby, LobbyMember } from 'state'

export class ReadyCheck {
    membersForCheck: LobbyMember[]
    readyMembers: LobbyMember[] = []
    lobby: Lobby

    constructor(lobby: Lobby) {
        this.lobby = lobby
        this.membersForCheck = [...lobby.members]

        lobby.publish('ReadyCheck-Start', {
            members: this.membersForCheck.map(member => member.data())
        })

        setTimeout(() => {
            if (this && lobby.readyCheck === this) {
                this.membersForCheck.forEach(member => {
                    if (!this.readyMembers.includes(member)) {
                        this.lobby.publish('ReadyCheck-PlayerStatus', {
                            nickname: member.user.state.nickname,
                            ready: false
                        })
                    }
                })

                this.lobby.publish('ReadyCheck-End', {
                    status: 'failed'
                })

                delete this.lobby.readyCheck
            }
        }, 15000)
    }

    status(member: LobbyMember, ready: boolean) {
        if (this.membersForCheck.includes(member) && !this.readyMembers.includes(member)) {
            this.readyMembers.push(member)

            this.lobby.publish('ReadyCheck-PlayerStatus', {
                nickname: member.user.state.nickname,
                ready
            })

            if (!ready) {
                this.lobby.publish('ReadyCheck-End', {
                    status: 'failed'
                })

                delete this.lobby.readyCheck

                return
            }
        }

        if (this.membersForCheck.length === this.readyMembers.length) {
            this.lobby.publish('ReadyCheck-End', {
                status: 'success'
            })

            delete this.lobby.readyCheck
        }
    }
}
