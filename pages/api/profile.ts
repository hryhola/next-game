// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import formidable from 'formidable'
import type { NextApiRequest } from 'next'
import { parseForm } from 'util/formDataRequest'
import logger from 'logger'
import path from 'path'
import { GeneralFailure, GeneralSuccess, NextApiResponseUWS } from 'util/universalTypes'

export type Request = FormData

type Success = GeneralSuccess & {
    userAvatarUrl?: string
}

export type Response = Success | GeneralFailure

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS<Response>) {
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

    const user = res.socket.server.appState.users.getByToken(token)

    if (!user) {
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

    let avatar

    const updatedInfo: Record<string, string> = {}

    if (files.image) {
        const avatarFullPath = (files.image as formidable.File).filepath
        const parsedPath = path.parse(avatarFullPath)
        avatar = 'res/avatar/' + parsedPath.base
        updatedInfo.userAvatarUrl = avatar
    }

    updatedInfo.userNickname = fields.userNickname as string

    if (fields.userColor) {
        updatedInfo.userColor = fields.userColor as string
    }

    user.update(updatedInfo)

    res.status(200).json({
        success: true,
        userAvatarUrl: avatar
    })
}

export const config = {
    api: {
        bodyParser: false
    }
}
