import { makeAutoObservable } from 'mobx'
import { AbstractGame, Chat, State, GameCtors, GameName, LobbyMember, User } from 'state'
import { AbstractSocketMessage } from 'uWebSockets/uws.types'
import { reactions } from './Lobby.reactions'

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
    creatorID: string
    password?: string
    chat: Chat = new Chat()
    game!: AbstractGame
    sessionStartData: any

    constructor(data: LobbyCreateOptions<G>) {
        this.id = data.id
        this.password = data.password
        this.creatorID = data.creator.nickname
        this.sessionStartData = data.sessionStartData

        const creatorAsMember = new LobbyMember(this, data.creator)

        creatorAsMember.isCreator = true

        this.members.push(creatorAsMember)

        const GameConstructor = GameCtors[data.gameName]

        this.game = new GameConstructor(this)

        this.game.join(creatorAsMember)

        makeAutoObservable(this)

        reactions(this)
    }

    publish(message: AbstractSocketMessage) {
        State.res.publish(`lobby-${this.id}-all`, message)
    }

    join(user: User) {
        const existed = this.members.find(m => m.user.nickname === user.nickname)

        if (existed) {
            return {
                success: true,
                message: 'Already existed',
                members: this.members
            }
        }

        const member = new LobbyMember(this, user)

        this.members.push(member)

        this.publish({
            ctx: 'Lobby-Join',
            data: {
                success: true,
                lobbyId: this.id,
                member: member.toJSON()
            }
        })

        this.game.join(member)

        return {
            success: true,
            members: this.members
        }
    }

    getPublicData(): TLobbyPublicData {
        return {
            id: this.id,
            private: Boolean(this.password),
            gameName: (Object.getPrototypeOf(this.game).constructor as typeof AbstractGame).gameName as GameName,
            membersCount: this.members.length,
            creatorID: this.creatorID
        }
    }

    toJSON() {
        return {
            id: this.id,
            creatorID: this.creatorID,
            members: this.members.map(m => m.toJSON()),
            game: this.game
        }
    }
}

export type TLobbyPublicData = {
    id: string
    private: boolean
    gameName: GameName
    membersCount: number
    creatorID: string
}
