import { Handler } from 'uWebSockets/uws.types'
import type { LobbyBaseInfo } from 'shared/contracts/lobby'

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
