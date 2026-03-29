import { UserRegistry, LobbiesRegistry, Chat, User } from 'state'
import type { RealtimeBus } from 'shared/domain'

export class State {
    static realtime: RealtimeBus

    globalChat = new Chat('global', 100, true)
    lobbies = new LobbiesRegistry()
    users = new UserRegistry()

    constructor(realtime: RealtimeBus) {
        State.realtime = realtime
    }

    data() {
        const data = {
            globalChat: this.globalChat.data(),
            lobbies: this.lobbies.data(),
            users: this.users.data(),
            games: Object.values(this.lobbies.container).map(lobby => ({
                ...lobby.game.data(lobby.game),
                log: lobby.game.currentSession?.log
            }))
        }

        return data
    }
}
