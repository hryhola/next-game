import { UserRegistry, LobbiesRegistry, Chat } from 'state'
import Publisher from 'uWebSockets/utils/ws/Publisher'

export class State {
    static act: Publisher

    globalChat = new Chat('global', 100, true)
    lobbies = new LobbiesRegistry()
    users = new UserRegistry()

    constructor(res: Publisher) {
        State.act = res
    }

    data() {
        const data = {
            globalChat: this.globalChat.data(),
            lobbies: this.lobbies.data(),
            users: this.users.data(),
            games: Object.values(this.lobbies.container).map(lobby => lobby.game.data())
        }

        return data
    }
}
