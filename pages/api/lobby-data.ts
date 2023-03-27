import type { NextApiRequest } from 'next'
import { GameData, LobbyData, LobbyMemberRole } from 'state'
import { GeneralFailure, GeneralSuccess, NextApiResponseUWS } from 'util/universalTypes'

export type Request = {
    lobbyId: string
}

type Success = GeneralSuccess & {
    lobby: LobbyData
    game: GameData
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

    const lobby = appState.lobbies.get(request.lobbyId)

    if (!lobby) {
        return res.json({
            success: false,
            message: 'Cannot lobby with id: ' + request.lobbyId
        })
    }

    if (lobby.creator !== user && !lobby.members.some(member => member.user === user)) {
        return res.json({
            success: false,
            message: 'You are not a member of this lobby'
        })
    }

    res.json({
        success: true,
        lobby: lobby.data(),
        game: lobby.game.data()
    })
}
