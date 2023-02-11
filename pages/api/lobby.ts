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

    const creator = res.socket.server.appState.users.getByToken(token)

    if (!creator) {
        return res.status(400).json({
            success: false,
            message: 'Invalid token: ' + token
        })
    }

    const [result, error] = await parseForm(req)

    if (error) {
        logger.error({ error }, 'Error during form parsing (lobby create)')

        return res.status(500).json({
            success: false,
            message: 'Error during form parsing' + String(error)
        })
    }

    const { fields, files } = result!

    if (!fields.lobbyId || Array.isArray(fields.lobbyId)) {
        return res.status(400).json({
            success: false,
            message: 'Lobby ID is not valid'
        })
    }

    if (!fields.gameName || Array.isArray(fields.gameName) || !(fields.gameName in GameCtors)) {
        return res.status(400).json({
            success: false,
            message: 'Game name is not valid'
        })
    }

    if (Array.isArray(fields.password)) {
        return res.status(400).json({
            success: false,
            message: 'Not correct password type'
        })
    }

    res.socket.server.appState.lobbies.createLobby({
        id: fields.lobbyId,
        creator,
        gameName: fields.gameName as GameName,
        password: fields.password
        // sessionStartData
    })

    res.json({
        success: true
    })
}

export const config = {
    api: {
        bodyParser: false
    }
}
