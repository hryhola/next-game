import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    lobbyId: string
    from: string
    to: string
}

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (actions, state, data) => {
    const lobby = state.lobbies.get(data.lobbyId)

    if (!lobby) {
        return actions.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.members.some(m => m.user.state.nickname === data.from)) {
        return actions.res({
            success: false,
            message: "User 'from' not in lobby"
        })
    }

    if (!lobby.members.some(m => m.user.state.nickname === data.to)) {
        return actions.res({
            success: false,
            message: "User 'to' not in lobby"
        })
    }

    lobby.publish('Lobby-Tipped', {
        lobbyId: lobby.id,
        from: data.from,
        to: data.to
    })
}
