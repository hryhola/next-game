import type { NextApiRequest } from 'next'
import { GameData, LobbyData, LobbyMemberRole } from 'state'
import { GeneralFailure, GeneralSuccess, NextApiResponseUWS } from 'util/universalTypes'

export type Request = {
    lobbyId: string
    joinAs: LobbyMemberRole
    password?: string
}

type Success = GeneralSuccess & {
    gameJoiningResult?: GeneralSuccess | GeneralFailure | null
}

export type Response = GeneralFailure | Success

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

    const request: Partial<Request> = JSON.parse(req.body)

    if (!request.lobbyId || typeof request.lobbyId !== 'string') {
        return res.json({
            success: false,
            message: 'Lobby id is missing'
        })
    }

    if (!request.joinAs || typeof request.joinAs !== 'string' || !['player', 'spectator'].includes(request.joinAs)) {
        return res.json({
            success: false,
            message: 'Join role is incorrect'
        })
    }

    const lobby = appState.lobbies.get(request.lobbyId)

    if (!lobby) {
        return res.json({
            success: false,
            message: 'Cannot lobby with id: ' + request.lobbyId
        })
    }

    if (lobby.password && lobby.password !== request.password) {
        return res.json({
            success: false,
            message: 'Incorrect password'
        })
    }

    const lobbyJoiningResult = lobby.join(user, request.joinAs)

    if (lobbyJoiningResult.success === false) {
        return res.json({
            success: false,
            message: lobbyJoiningResult.message
        })
    }

    res.json({
        success: true,
        gameJoiningResult: lobbyJoiningResult.gameJoiningResult
    })
}
