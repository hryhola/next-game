import { Lobby, LobbyMember, LobbyMemberData } from 'state'

export type ReadyCheckMember = LobbyMemberData & { ready?: boolean }

export class ReadyCheck {
    membersForCheck: LobbyMember[]
    readyMembers: LobbyMember[] = []
    notReadyMembers: LobbyMember[] = []
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
                            userNickname: member.user.state.userNickname,
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
        if (this.membersForCheck.includes(member) && !this.readyMembers.includes(member) && !this.notReadyMembers.includes(member)) {
            this[ready ? 'readyMembers' : 'notReadyMembers'].push(member)

            this.lobby.publish('ReadyCheck-PlayerStatus', {
                userNickname: member.user.state.userNickname,
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

    data() {
        return {
            members: this.membersForCheck.map(member => {
                const data: ReadyCheckMember = member.data()

                if (this.readyMembers.includes(member)) {
                    data.ready = true
                }

                if (this.notReadyMembers.includes(member)) {
                    data.ready = false
                }

                return data
            })
        }
    }
}
