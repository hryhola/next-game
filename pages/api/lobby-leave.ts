import type { NextApiRequest } from 'next'
import { AbstractGameData, LobbyData } from 'state'
import { GeneralFailure, NextApiResponseUWS } from 'util/t'

export interface Success {
    success: true
}

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS<Success | GeneralFailure>) {
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

    const result = lobby.leave(user)

    if (result.success === false) {
        return res.json({
            success: false,
            message: result.message!
        })
    }

    res.json({
        success: true
    })
}
