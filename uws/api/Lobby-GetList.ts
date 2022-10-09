import { Handler } from 'uws/uws.types'
import { state } from '../../state'

export interface LobbyInfo {
    id: string
    private: boolean
}

export interface Success {
    lobbies: LobbyInfo[]
}

export const handler: Handler = res => {
    const lobbies = Object.values(state.lobbies)

    res.res<'Lobby-GetList'>({
        lobbies: lobbies.map(l => ({
            id: l.id,
            private: Boolean(l.password)
        }))
    })
}
