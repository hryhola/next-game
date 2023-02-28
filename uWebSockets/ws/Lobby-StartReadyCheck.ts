import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    lobbyId: string
}

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (actions, state, data, token) => {
    const lobby = state.lobbies.get(data.lobbyId)

    if (!lobby) {
        return actions.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.members.some(p => p.user.token === token)) {
        return actions.res({
            success: false,
            message: 'You are not a member of this lobby'
        })
    }

    lobby.startReadyCheck()

    return actions.res({
        success: true
    })
}
