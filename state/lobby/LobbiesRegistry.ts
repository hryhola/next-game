import { makeAutoObservable } from 'mobx'
import { GameName } from 'state/games'
import { Lobby, LobbyCreateOptions } from './Lobby'

export class LobbiesRegistry {
    container: Record<string, Lobby<GameName>> = {}

    constructor() {
        makeAutoObservable(this)
    }

    createLobby<G extends GameName>(data: LobbyCreateOptions<G>) {
        if (data.id in this.container) {
            throw new Error(`Lobby with id ${data.id} already exists`)
        }

        const lobby = new Lobby(data)

        this.container[data.id] = lobby
    }

    get(id: string) {
        return this.container[id] || null
    }
}
