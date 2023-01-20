// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import formidable from 'formidable'
import fetch from 'node-fetch'
import type { NextApiRequest, NextApiResponse } from 'next'
import { parseForm } from 'util/formDataRequest'
import { WsPostUrl } from 'uWebSockets/post'
import logger from 'logger'
import path from 'path'

export type Failure = {
    success: false
    message: string
}

export type Success = {
    success: true
    avatarRes: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Success | Failure>) {
    if (req.method !== 'POST') {
        res.status(400)

        return res.end()
    }

    const token = req.cookies.token

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Auth token is missing'
        })
    }

    const authResult = (await fetch(WsPostUrl.auth, {
        method: 'POST',
        body: JSON.stringify({ token })
    }).then(r => r.json())) as { isValid: boolean }

    if (!authResult.isValid) {
        return res.status(400).json({
            success: false,
            message: 'Invalid auth token'
        })
    }

    const [result, error] = await parseForm(req, 'avatar', true)

    if (error) {
        logger.error({ error }, 'form data parsing failure')

        return res.status(500).json({
            success: false,
            message: 'Error during form parsing' + String(error)
        })
    }

    const { fields, files } = result!

    const avatarFullPath = (files.image as formidable.File).filepath

    const parsedPath = path.parse(avatarFullPath)

    const avatarResourceId = 'avatar/' + parsedPath.base

    const requestResult = (await fetch(WsPostUrl.profile, {
        method: 'POST',
        body: JSON.stringify({
            imageResId: avatarResourceId,
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
        avatarRes: avatarResourceId
    })
}

export const config = {
    api: {
        bodyParser: false
    }
}
