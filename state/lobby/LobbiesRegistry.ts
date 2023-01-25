import { makeAutoObservable, reaction } from 'mobx'
import { State } from 'state/AppState'
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

        reaction(
            () => this.container[data.id].chat.messages.length,
            curr => {
                State.res.publish(`lobby-${data.id}-all`, {
                    ctx: 'Chat-NewMessage',
                    data: {
                        scope: 'lobby',
                        lobbyId: data.id,
                        message: this.container[data.id].chat.messages.at(-1)!
                    }
                })
            }
        )
    }

    get(id: string) {
        return this.container[id] || null
    }
}
