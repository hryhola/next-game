// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import type { NextApiRequest, NextApiResponse } from 'next'
import { GameCtors, GameName } from 'state/games'
import { parseForm } from 'util/formDataRequest'
import { NextApiResponseUWS } from 'util/t'

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS) {
    const token = req.cookies.token

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Auth token is missing'
        })
    }

    const { appState } = res.socket.server

    const user = appState.users.auth(token)

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

    const gameJoinResult = lobby.game.join(lobbyJoinResult.members.find(m => m.user.nickname === user.nickname)!)

    res.json({
        success: true,
        lobbyJoinResult,
        gameJoinResult
    })
}
