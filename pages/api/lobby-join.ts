import type { NextApiRequest } from 'next'
import { GameData, LobbyData } from 'state'
import { NextApiResponseUWS } from 'util/t'

export interface Failure {
    success: false
    message: string
}

export interface Success {
    success: true
    lobby: LobbyData
    game: GameData
}

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS<Success | Failure>) {
    const token = req.cookies.token

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Auth token is missing'
        })
    }

    const { appState } = res.socket.server

    const user = appState.users.getByToken(token)

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Invalid token: ' + token
        })
    }

    const request = JSON.parse(req.body)

    const lobby = appState.lobbies.get(request.lobbyId)

    if (!lobby) {
        return res.json({
            success: false,
            message: 'Cannot lobby with id: ' + request.lobbyId
        })
    }

    const lobbyJoinResult = lobby.join(user)

    if (lobbyJoinResult.success === false) {
        return res.json({
            success: false,
            message: lobbyJoinResult.message!
        })
    }

    res.json({
        success: true,
        lobby: lobby.data(),
        game: lobby.game.data()
    })
}
