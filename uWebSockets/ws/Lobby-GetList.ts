import { Handler } from 'uWebSockets/uws.types'

export interface LobbyInfo {
    id: string
    private: boolean
}

export interface Success {
    lobbies: LobbyInfo[]
}

export const handler: Handler<null, Success> = (actions, state) => {
    const lobbies = Object.values(state.lobbies.container)

    actions.res({
        lobbies: lobbies.map(l => ({
            id: l.id,
            private: Boolean(l.password)
        }))
    })
}
