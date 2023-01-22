import { makeAutoObservable } from 'mobx'
import { Chat, UserRegistry, LobbiesRegistry } from 'state'

export class State {
    globalChat = new Chat(1000)

    lobbies = new LobbiesRegistry()

    users = new UserRegistry()

    constructor() {
        makeAutoObservable(this)
    }
}
