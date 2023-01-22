import { Handler } from '../uws.types'
import { Lobby } from 'state'

export interface Request {
    creatorId: string
    lobbyId: string
    password?: string
}

export interface Success {
    success: true
    lobbyId: string
}

export interface Failure {
    success: false
    lobbyId: string
    message: string
}

export const handler: Handler<Request, Success | Failure> = (actions, state, data) => {
    if (!data.lobbyId) {
        return actions.res({
            success: false,
            message: 'Room ID cannot be empty',
            lobbyId: data.lobbyId
        })
    }

    if (data.lobbyId in state.lobbies) {
        return actions.res({
            success: false,
            message: 'Room already exists',
            lobbyId: data.lobbyId
        })
    }

    const user = state.users.getByNickname(data.creatorId)

    if (!user) {
        return actions.res({
            success: false,
            message: 'Cannot find user with such nickname',
            lobbyId: data.lobbyId
        })
    }

    const lobby = new Lobby(data.lobbyId, user, data.password)

    state.lobbies.add(lobby)

    actions.res({
        success: true,
        lobbyId: lobby.id
    })
}
