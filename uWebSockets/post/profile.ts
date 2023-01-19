import uws from 'uWebSockets.js'

import { state } from 'state'
import logger from 'logger'
import { readJSON } from 'uWebSockets/utils/parse'

export interface Failure {
    success: false
    message: string
}

export interface Success {
    success: true
}

export const handler = async (res: uws.HttpResponse, req: uws.HttpRequest) => {
    logger.info('POST profile-update request')

    res.writeHeader('Content-Type', 'application/json')

    const data = await readJSON<{ imageResId: string; nickname: string; token: string }>(res)

    const user = state.auth[data.token]

    user.nickname = data.nickname
    user.avatarRes = data.imageResId

    return res.end(
        JSON.stringify({
            success: true
        })
    )
}
