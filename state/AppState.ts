import { makeAutoObservable } from 'mobx'
import { Chat, UserRegistry, LobbiesRegistry } from 'state'
import { ReactionActions } from 'uWebSockets/utils/reactions'
import { reactions } from './AppState.reactions'

export class State {
    static res: ReactionActions

    globalChat = new Chat(1000)
    lobbies = new LobbiesRegistry()
    users = new UserRegistry()

    constructor(res: ReactionActions) {
        State.res = res

        makeAutoObservable(this)

        reactions(this)
    }

    toJSON() {
        return {
            globalChat: this.globalChat.toJSON(),
            lobbies: this.lobbies.toJSON(),
            users: this.users.toJSON()
        }
    }
}
