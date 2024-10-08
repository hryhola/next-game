import { State, GameName, Lobby, LobbyCreateOptions } from 'state'

export class LobbiesRegistry {
    container: Record<string, Lobby<GameName>> = {}

    publishListUpdate() {
        State.act.publishTopicEvent('Lobby-ListUpdated', {
            lobbies: Object.values(this.container).map(lobby => ({
                id: lobby.id,
                private: !!lobby.password
            }))
        })
    }

    async createLobby<G extends GameName>(data: LobbyCreateOptions<G>) {
        if (data.id in this.container) {
            throw new Error(`Lobby with id ${data.id} already exists`)
        }

        const lobby = new Lobby(data)

        await lobby.game.postConstructor()

        this.container[data.id] = lobby

        this.publishListUpdate()

        return lobby
    }

    destroyLobby(lobby: Lobby) {
        if (!(lobby.id in this.container)) {
            return {
                success: false,
                message: `Lobby with id ${lobby.id} not found`
            }
        }

        lobby.destroy()

        delete this.container[lobby.id]

        this.publishListUpdate()

        return {
            success: true
        }
    }

    get(id: string) {
        return this.container[id] || null
    }

    data() {
        return Object.values(this.container).map(lobby => lobby.data())
    }
}
