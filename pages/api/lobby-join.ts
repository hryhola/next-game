import type { NextApiRequest } from 'next'
import { GameData, LobbyData } from 'state'
import { NextApiResponseUWS } from 'util/universalTypes'

export type Request = {
    lobbyId: string
    joinAs: 'player' | 'spectator'
}

interface Failure {
    success: false
    message: string
}

interface Success {
    success: true
    lobby: LobbyData
    game: GameData
}

export type Response = Failure | Success

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

    const lobbyJoinResult = lobby.join(user, request.joinAs)

    if (lobbyJoinResult.success === false) {
        return res.json({
            success: false,
            message: lobbyJoinResult.message
        })
    }

    res.json({
        success: true,
        lobby: lobby.data(),
        game: lobby.game.data()
    })
}
