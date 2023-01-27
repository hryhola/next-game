// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import formidable from 'formidable'
import type { NextApiRequest } from 'next'
import { parseForm } from 'util/formDataRequest'
import logger from 'logger'
import path from 'path'
import { NextApiResponseUWS } from 'util/t'

export type Failure = {
    success: false
    message: string
}

export type Success = {
    success: true
    avatarRes?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS<Success | Failure>) {
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

    const user = res.socket.server.appState.users.auth(token)

    if (!user) {
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

    let avatarResourceId

    if (files.image) {
        const avatarFullPath = (files.image as formidable.File).filepath
        const parsedPath = path.parse(avatarFullPath)
        avatarResourceId = 'avatar/' + parsedPath.base

        user.setAvatarRes(avatarResourceId)
    }

    user.setNickname(fields.nickname as string)

    if (fields.nicknameColor) {
        user.setNicknameColor(fields.nicknameColor as string)
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
