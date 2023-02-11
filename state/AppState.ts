import { UserRegistry, LobbiesRegistry, Chat } from 'state'
import Publisher from 'uWebSockets/utils/ws/Publisher'

export class State {
    static res: Publisher

    globalChat = new Chat('global', 100, true)
    lobbies = new LobbiesRegistry()
    users = new UserRegistry()

    constructor(res: Publisher) {
        State.res = res
    }
}
