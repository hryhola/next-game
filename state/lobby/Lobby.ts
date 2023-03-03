import { AbstractGame, Chat, State, GameCtors, GameName, LobbyMember, User, ReadyCheck } from 'state'
import { AbstractSocketMessage } from 'uWebSockets/uws.types'

export type LobbyCreateOptions<G extends GameName> = {
    id: string
    creator: User
    password?: string
    gameName: G
    sessionStartData?: any
}

export class Lobby<G extends GameName = GameName> {
    id: string
    members: LobbyMember[] = []
    creator: User
    password?: string
    chat: Chat
    game!: AbstractGame
    sessionStartData: any
    readyCheck?: ReadyCheck

    constructor(data: LobbyCreateOptions<G>) {
        this.id = data.id
        this.password = data.password
        this.creator = data.creator
        this.sessionStartData = data.sessionStartData
        this.chat = new Chat(this.id)

        const GameConstructor = GameCtors[data.gameName]

        this.game = new GameConstructor(this)
    }

    publish(сtx: AbstractSocketMessage['ctx'], data: AbstractSocketMessage['data']) {
        State.res.publish(`Lobby-${this.id}`, {
            ctx: сtx,
            data
        })
    }

    join(user: User) {
        const existed = this.members.find(m => m.user === user)

        if (existed) {
            return {
                success: true,
                message: 'Already existed'
            }
        }

        const member = new LobbyMember(this, user)

        this.members.push(member)

        user.linkLobby(this)

        this.publish('Lobby-Join', {
            lobbyId: this.id,
            member: member.data()
        })

        this.game.join(member)

        return {
            success: true
        }
    }

    leave(user: User) {
        const member = this.members.find(m => m.user === user)

        if (!member) {
            return {
                success: false,
                message: 'Not found'
            }
        }

        if (member.state.isPlayer) {
            const player = this.game.players.find(p => p.member.user === user)!

            this.game.leave(player)
        }

        this.members = this.members.filter(m => m !== member)

        user.unlinkLobby(this)

        user.ws.unsubscribe(`Lobby-${this.id}`)

        this.publish('Lobby-Leave', {
            lobbyId: this.id,
            member: member.data()
        })

        return {
            success: true
        }
    }

    destroy() {
        this.publish('Lobby-Destroy', {
            lobbyId: this.id
        })

        this.members.forEach(m => {
            m.user.unlinkLobby(this)
        })

        return {
            success: true
        }
    }

    startReadyCheck() {
        this.readyCheck = new ReadyCheck(this)
    }

    data() {
        return {
            id: this.id,
            private: Boolean(this.password),
            gameName: (Object.getPrototypeOf(this.game).constructor as typeof AbstractGame).gameName as GameName,
            members: this.members.map(m => m.data()),
            creator: this.creator.data(),
            readyCheck: this.readyCheck ? this.readyCheck.data() : null
        }
    }
}

export type LobbyData = ReturnType<Lobby['data']>
