import { Handler } from 'uWebSockets/uws.types'
import { state } from '../../state'

export interface LobbyInfo {
    id: string
    private: boolean
}

export interface Success {
    lobbies: LobbyInfo[]
}

export const handler: Handler<null, Success> = actions => {
    const lobbies = Object.values(state.lobbies)

    actions.res({
        lobbies: lobbies.map(l => ({
            id: l.id,
            private: Boolean(l.password)
        }))
    })
}
