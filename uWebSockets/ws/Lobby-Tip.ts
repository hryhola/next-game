import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { Handler } from 'uWebSockets/uws.types'

interface Request {
    lobbyId: string
    id: string
    from: string
    to: string
}

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (act, state, data) => {
    const lobby = state.lobbies.get(data.lobbyId)

    if (!lobby) {
        return act.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.members.some(m => m.user.state.nickname === data.from)) {
        return act.res({
            success: false,
            message: "User 'from' not in lobby"
        })
    }

    if (!lobby.members.some(m => m.user.state.nickname === data.to)) {
        return act.res({
            success: false,
            message: "User 'to' not in lobby"
        })
    }

    lobby.publish('Lobby-Tipped', data)
}
