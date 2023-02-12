import { State, GameName, Lobby, LobbyCreateOptions } from 'state'

export class LobbiesRegistry {
    container: Record<string, Lobby<GameName>> = {}

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

    data() {
        return Object.values(this.container).map(lobby => lobby.data())
    }
}
