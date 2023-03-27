import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    lobbyId: string
}

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (act, state, data, token) => {
    const lobby = state.lobbies.get(data.lobbyId)

    if (!lobby) {
        return act.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.members.some(p => p.user.token === token)) {
        return act.res({
            success: false,
            message: 'You are not a member of this lobby'
        })
    }

    if (lobby.readyCheck) {
        return act.res({
            success: false,
            message: 'Ready check already started'
        })
    }

    if (lobby.game.currentSession) {
        return act.res({
            success: false,
            message: 'Game already started'
        })
    }

    lobby.startReadyCheck()

    return act.res({
        success: true
    })
}
