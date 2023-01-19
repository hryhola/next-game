// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import formidable from 'formidable'
import fetch from 'node-fetch'
import type { NextApiRequest, NextApiResponse } from 'next'
import { parseForm } from 'util/formDataRequest'
import { WsUrl } from 'uWebSockets/post'
import logger from 'logger'

export type Failure = {
    success: false
    message: string
}

export type Success = {
    success: true
    avatarResourceId: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Success | Failure>) {
    if (req.method !== 'POST') {
        res.status(400)

        return res.end()
    }

    const token = req.headers.authorization

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Auth token is missing'
        })
    }

    const authResult = (await fetch(WsUrl.auth, {
        method: 'POST',
        body: JSON.stringify({ token })
    }).then(r => r.json())) as { isValid: boolean }

    if (!authResult.isValid) {
        return res.status(400).json({
            success: false,
            message: 'Invalid auth token'
        })
    }

    const [result, error] = await parseForm(req, 'avatar')

    if (error) {
        logger.error({ error }, 'form data parsing failure')

        return res.status(500).json({
            success: false,
            message: 'Error during form parsing' + String(error)
        })
    }

    const { fields, files } = result!

    const avatarFullPath = (files.image as formidable.File).filepath

    const avatarResourceId = 'avatar/' + avatarFullPath.split('\\').pop()!

    const requestResult = (await fetch(WsUrl.profile, {
        method: 'POST',
        body: JSON.stringify({
            imageResId: avatarFullPath,
            nickname: fields.nickname,
            token
        })
    }).then(r => r.json())) as { success: boolean; message: string }

    if (!requestResult.success) {
        return res.status(500).json({
            success: false,
            message: requestResult.message
        })
    }

    res.status(200).json({
        success: true,
        avatarResourceId
    })
}

export const config = {
    api: {
        bodyParser: false
    }
}
