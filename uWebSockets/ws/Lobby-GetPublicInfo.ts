import { LobbyData } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    id: string
}

type Success = GeneralSuccess & {
    lobbyData: LobbyData
}

export const handler: Handler<Request, Success | GeneralFailure> = (actions, state, data) => {
    if (!data.id) {
        return actions.res({
            success: false,
            message: 'Lobby ID missing'
        })
    }

    const lobby = state.lobbies.get(data.id)

    if (!lobby) {
        return actions.res({
            success: false,
            message: 'Cannot find lobby with ID: ' + data.id
        })
    }

    actions.res({
        success: true,
        lobbyData: lobby.data()
    })
}
