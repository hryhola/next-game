import uws from 'uWebSockets.js'

import { state } from 'state'
import logger from 'logger'
import { readJSON } from 'uWebSockets/utils/parse'

const multipart = require('parse-multipart-data')

export interface Failure {
    success: false
    message: string
}

export interface Success {
    success: true
}

export const handler = async (res: uws.HttpResponse, req: uws.HttpRequest) => {
    logger.info('POST auth request')

    const data = await readJSON<{ token: string }>(res)

    const isValid = data.token in state.auth

    res.writeHeader('Content-Type', 'application/json')

    return res.end(
        JSON.stringify({
            isValid
        })
    )
}
