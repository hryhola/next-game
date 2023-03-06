import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

export interface Request {
    lobbyId: string
}

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (act, state, data, token) => {
    const user = state.users.getByToken(token!)

    if (!user) {
        return act.res({
            success: false,
            message: 'User not found'
        })
    }

    const { lobbyId } = data

    const lobby = state.lobbies.get(lobbyId)

    if (!lobby) {
        return act.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (!lobby.game.players.some(p => p.member.user === user)) {
        return act.res({
            success: false,
            message: 'You are not a player of this lobby'
        })
    }

    var result = lobby.game.startSession()

    return act.res(result)
}
