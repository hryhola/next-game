import type { NextApiRequest } from 'next'
import { GameCtors, GameName } from 'state'
import { InitialGameDataSchema } from 'state/common/game/GameInitialData'
import { GeneralFailure, GeneralSuccess, NextApiResponseUWS } from 'util/universalTypes'

export type Request = {
    gameName: GameName
}

type Success = GeneralSuccess & {
    initialDataScheme?: InitialGameDataSchema
    gameName: GameName
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

    if (!request.gameName) {
        return res.status(400).json({
            success: false,
            message: 'Game name is missing'
        })
    }

    const Game = GameCtors[request.gameName]

    if (!Game) {
        return res.status(400).json({
            success: false,
            message: 'Invalid game name: ' + request.gameName
        })
    }

    return res.status(200).json({
        success: true,
        initialDataScheme: Game.initialDataSchema,
        gameName: request.gameName
    })
}
