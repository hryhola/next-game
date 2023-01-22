import { makeAutoObservable } from 'mobx'
import { Lobby } from './Lobby'

export class LobbiesRegistry {
    lobbies: Record<string, Lobby> = {}

    constructor() {
        makeAutoObservable(this)
    }

    add(lobby: Lobby) {
        this.lobbies[lobby.id] = lobby
    }
}
