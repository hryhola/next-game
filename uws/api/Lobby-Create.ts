import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { topics } from '../events'
import { Lobby } from 'model'

export interface CreateLobbyRequest {
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

export const handler: Handler<CreateLobbyRequest> = (res, data) => {
    if (!data.lobbyId) {
        return res.res<'Lobby-Create'>({
            success: false,
            message: 'Room ID cannot be empty',
            lobbyId: data.lobbyId
        })
    }

    if (data.lobbyId in state.lobbies) {
        return res.res<'Lobby-Create'>({
            success: false,
            message: 'Room already exists',
            lobbyId: data.lobbyId
        })
    }

    const user = state.users.find(u => u.id === data.creatorId)!

    if (!user) {
        return res.res<'Lobby-Create'>({
            success: false,
            message: 'Cannot find user with such nickname',
            lobbyId: data.lobbyId
        })
    }

    const lobby = new Lobby(data.lobbyId, user, data.password)

    state.lobbies[lobby.id] = lobby

    res.res<'Lobby-Create'>({
        success: true,
        lobbyId: lobby.id
    })
}
