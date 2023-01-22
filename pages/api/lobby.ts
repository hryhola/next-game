// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { parseForm } from 'util/formDataRequest'
import { uWSRest } from 'uWebSockets/rest'

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

    const createResult = await fetch(uWSRest.lobby, {
        method: 'POST',
        body: JSON.stringify({ fields, files })
    }).then(r => r.json())

    res.json(createResult)
}

export const config = {
    api: {
        bodyParser: false
    }
}
