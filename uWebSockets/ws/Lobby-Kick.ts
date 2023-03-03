import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

export interface Request {
    lobbyId: string
    memberNickname: string
}

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (act, state, data, token) => {
    const user = state.users.getByToken(token!)

    if (!user) {
        return act.res({
            success: false,
            message: 'User not found'
        })
    }

    const { lobbyId, memberNickname } = data

    const lobby = state.lobbies.get(lobbyId)

    if (!lobby) {
        return act.res({
            success: false,
            message: 'Lobby not found'
        })
    }

    if (lobby.creator !== user) {
        return act.res({
            success: false,
            message: 'Only creator can kick'
        })
    }

    var result = lobby.kick(memberNickname)

    return act.res(result)
}
