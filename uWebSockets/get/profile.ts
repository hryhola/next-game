import uws from 'uWebSockets.js'

import { state } from 'state'
import logger from 'logger'
import queryString from 'query-string'

export interface Failure {
    success: false
    message: string
}

export interface Success {
    success: true
}

export const handler = async (res: uws.HttpResponse, req: uws.HttpRequest) => {
    logger.info('GET profile request')

    res.writeHeader('Content-Type', 'application/json')

    const data = queryString.parse(req.getQuery()) as { token?: string }

    if (!data.token) {
        return res.end(
            JSON.stringify({
                success: false,
                message: 'Token missing'
            })
        )
    }

    const user = state.auth[data.token]

    if (!user) {
        return res.end(
            JSON.stringify({
                success: false,
                message: 'Invalid token'
            })
        )
    }

    return res.end(
        JSON.stringify({
            success: true,
            user
        })
    )
}
