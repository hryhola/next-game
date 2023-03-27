import { LobbyData } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    id: string
}

type Success = GeneralSuccess & {
    lobbyData: LobbyData
}

export const handler: Handler<Request, Success | GeneralFailure> = (act, state, data) => {
    if (!data.id) {
        return act.res({
            success: false,
            message: 'Lobby ID missing'
        })
    }

    const lobby = state.lobbies.get(data.id)

    if (!lobby) {
        return act.res({
            success: false,
            message: 'Cannot find lobby with ID: ' + data.id
        })
    }

    act.res({
        success: true,
        lobbyData: lobby.data()
    })
}
