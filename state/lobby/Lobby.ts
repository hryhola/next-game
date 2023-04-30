import { Game, Chat, State, GameCtors, GameName, LobbyMember, User, ReadyCheck } from 'state'
import { InitialGameData } from 'state/common/game/GameInitialData'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { StateEventName, StateEvents } from 'uWebSockets/topicEvents'

export type LobbyCreateOptions<G extends GameName> = {
    id: string
    creator: User
    password?: string
    gameName: G
    initialGameData?: InitialGameData
}

export type LobbyMemberRole = 'player' | 'spectator'

export type LobbyJoiningResult =
    | (GeneralSuccess & {
          gameJoiningResult?: GeneralSuccess | GeneralFailure | null
      })
    | GeneralFailure

export class Lobby<G extends GameName = GameName> {
    id: string
    members: LobbyMember[] = []
    creator: User
    password?: string
    chat: Chat
    game!: Game
    readyCheck?: ReadyCheck

    constructor(data: LobbyCreateOptions<G>) {
        this.id = data.id
        this.password = data.password
        this.creator = data.creator
        this.chat = new Chat(this.id)

        const GameConstructor = GameCtors[data.gameName]

        this.game = new GameConstructor(this, data.initialGameData)
    }

    publish<E extends StateEventName>(сtx: E, data: StateEvents[E]) {
        State.act.publish(`Lobby-${this.id}`, {
            ctx: сtx,
            data
        })
    }

    join(user: User, as: LobbyMemberRole): LobbyJoiningResult {
        const existed = this.members.find(m => m.user === user)

        if (existed) {
            return {
                success: false,
                message: 'Already joined'
            }
        }

        const member = new LobbyMember(this, user)

        this.members.push(member)

        user.linkLobby(this)

        var gameJoiningResult: GeneralFailure | GeneralSuccess | null = null

        if (as === 'player') {
            gameJoiningResult = this.game.join(member)
        }

        this.publish('Lobby-Join', {
            lobbyId: this.id,
            member: member.data()
        })

        return {
            success: true,
            gameJoiningResult
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

        if (member.state.memberIsPlayer) {
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

    kick(userId: string): GeneralSuccess | GeneralFailure {
        const member = this.members.find(m => m.user.id === userId)

        if (!member) {
            return {
                success: false,
                message: 'Not found'
            }
        }

        if (member.user === this.creator) {
            return {
                success: false,
                message: "Creator can't be kicked"
            }
        }

        if (member.state.memberIsPlayer) {
            const player = this.game.players.find(p => p.member.user === member.user)!

            this.game.leave(player)
        }

        this.members = this.members.filter(m => m !== member)

        member.user.unlinkLobby(this)

        this.publish('Lobby-Kicked', {
            lobbyId: this.id,
            member: member.data()
        })

        return {
            success: true
        }
    }

    data() {
        return {
            id: this.id,
            private: Boolean(this.password),
            gameName: (Object.getPrototypeOf(this.game).constructor as typeof Game).gameName as GameName,
            members: this.members.map(m => m.data()),
            creator: this.creator.data(),
            readyCheck: this.readyCheck ? this.readyCheck.data() : null
        }
    }
}

export type LobbyData = ReturnType<Lobby['data']>
