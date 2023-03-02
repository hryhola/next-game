import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    lobbyId: string
    ready: boolean
}

export const handler: Handler<Request, GeneralFailure | GeneralSuccess> = (actions, state, data, token) => {
    const lobby = state.lobbies.get(data.lobbyId)
    const user = state.users.getByToken(token!)

    if (!lobby) {
        return actions.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.readyCheck) {
        return actions.res({
            success: false,
            message: 'No ready check in lobby'
        })
    }

    const member = user && lobby.members.find(m => m.user === user)

    if (!member) {
        return actions.res({
            success: false,
            message: 'User is not in lobby'
        })
    }

    lobby.readyCheck.status(member, data.ready)
}
