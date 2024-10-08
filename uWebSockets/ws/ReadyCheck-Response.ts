import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    lobbyId: string
    ready: boolean
}

export const handler: Handler<Request, GeneralFailure | GeneralSuccess> = (act, state, data, token) => {
    const lobby = state.lobbies.get(data.lobbyId)
    const user = state.users.getByToken(token!)

    if (!lobby) {
        return act.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.readyCheck) {
        return act.res({
            success: false,
            message: 'No ready check in lobby'
        })
    }

    const member = user && lobby.members.find(m => m.user === user)

    if (!member) {
        return act.res({
            success: false,
            message: 'User is not in lobby'
        })
    }

    lobby.readyCheck.status(member, data.ready)
}
