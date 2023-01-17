import uws from 'uWebSockets.js'

import { state } from 'state'

const multipart = require('parse-multipart-data')

export const handler = async (res: uws.HttpResponse, req: uws.HttpRequest) => {
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.writeHeader('Content-Type', 'application/json')

    return res.end(
        JSON.stringify({
            success: true,
            lobby: ''
        })
    )
}
