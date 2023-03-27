import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { Handler } from 'uWebSockets/uws.types'

export interface Request {
    lobbyId: string
    actionName: string
    actionPayload?: any
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

    const player = lobby.game.players.find(p => p.member.user === user)

    if (!player) {
        return act.res({
            success: false,
            message: 'You are not a player of this lobby'
        })
    }

    if (!lobby.game.currentSession) {
        return act.res({
            success: false,
            message: 'No session in progress'
        })
    }

    var result = lobby.game.currentSession.action(player, data.actionName, data.actionPayload)

    return act.res(result)
}
