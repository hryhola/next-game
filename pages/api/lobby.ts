// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { state } from 'state'
import { Jeopardy } from 'model/Jeopardy'
import { parseForm } from 'util/formDataRequest'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const [result, error] = await parseForm(req)

    if (error) {
        console.log(error)

        return res.status(500).json({
            success: false,
            message: 'Error during form parsing' + String(error)
        })
    }

    const { fields, files } = result!

    if (!fields.lobbyId) {
        return res.status(400).json({
            success: false,
            message: 'Room ID cannot be empty'
        })
    }

    if (!fields.creatorId) {
        return res.status(400).json({
            success: false,
            message: 'Creator ID cannot be empty'
        })
    }

    if (Array.isArray(fields.lobbyId)) {
        return res.status(400).json({
            success: false,
            message: 'Not correct lobby type'
        })
    }

    if (Array.isArray(fields.password)) {
        return res.status(400).json({
            success: false,
            message: 'Not correct password type'
        })
    }

    if (fields.lobbyId in state.lobbies) {
        return res.status(400).json({
            success: false,
            message: 'Room already exists',
            lobbyId: fields.lobbyId
        })
    }

    console.log(state)

    const user = state.users.find(u => u.nickname === fields.creatorId)!

    if (!user) {
        return res.status(500).json({
            success: false,
            message: 'Cannot find user with such nickname',
            lobbyId: fields.lobbyId
        })
    }

    const lobby = new Jeopardy(fields.lobbyId, user, fields.password)

    state.lobbies[lobby.id] = lobby

    return res.status(200).json({
        success: true,
        lobby: lobby.id
    })
}

export const config = {
    api: {
        bodyParser: false
    }
}
