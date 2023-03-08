import { Handler } from 'uWebSockets/uws.types'

export interface LobbyBaseInfo {
    id: string
    private: boolean
}

export interface Success {
    lobbies: LobbyBaseInfo[]
}

export const handler: Handler<null, Success> = (act, state) => {
    const lobbies = Object.values(state.lobbies.container)

    act.res({
        lobbies: lobbies.map(l => ({
            id: l.id,
            private: Boolean(l.password)
        }))
    })
}
