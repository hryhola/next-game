import { makeAutoObservable } from 'mobx'
import { GameCtors, GameName } from 'state/games'
import { AbstractGame } from 'state/games/AbstractGame'
import { Chat } from 'state/global/Chat'
import { User } from 'state/user/User'
import { LobbyMember } from './LobbyMember'

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

        const creatorAsMember = new LobbyMember(data.creator)

        creatorAsMember.isCreator = true

        this.members.push(creatorAsMember)

        const GameConstructor = GameCtors[data.gameName]

        this.game = new GameConstructor()

        this.game.join(creatorAsMember)

        makeAutoObservable(this)
    }

    join(user: User) {
        this.members.push(new LobbyMember(user))
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
}

export type TLobbyPublicData = {
    id: string
    private: boolean
    gameName: GameName
    membersCount: number
    creatorID: string
}
