import type { NextApiRequest } from 'next'
import { GeneralFailure, GeneralSuccess, NextApiResponseUWS } from 'util/universalTypes'

export type Request = {
    lobbyId: string
}

export type Response = GeneralSuccess | GeneralFailure

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS<Response>) {
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
