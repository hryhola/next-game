import uws from 'uWebSockets.js'

import { state } from 'state'

const multipart = require('parse-multipart-data')

export const handler = async (res: uws.HttpResponse, req: uws.HttpRequest) => {
    console.log('Posted to ' + req.getUrl())

    console.log(state.users)

    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.writeHeader('Content-Type', 'application/json')

    const contentType = req.getHeader('content-type')

    if (!contentType.includes('multipart/form-data') || !contentType.includes('boundary=')) {
        res.writeStatus('400 Bad Request')
        res.end(
            JSON.stringify({
                success: false,
                message: 'Incorrect content type'
            })
        )
    }

    const [, boundary] = contentType.split('boundary=')

    const buffer = await readFormData(res)

    const parts = multipart.parse(buffer, boundary)

    console.log(parts)

    return res.end(
        JSON.stringify({
            success: true,
            lobby: ''
        })
    )
}

const readFormData = (res: uws.HttpResponse): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        let buffer: Buffer

        res.onData((ab, isLast) => {
            let chunk = Buffer.from(ab)

            if (isLast) {
                if (buffer) {
                    return resolve(Buffer.concat([buffer, chunk]))
                } else {
                    return resolve(chunk)
                }
            } else {
                if (buffer) {
                    buffer = Buffer.concat([buffer, chunk])
                } else {
                    buffer = Buffer.concat([chunk])
                }
            }
        })

        res.onAborted(() => reject())
    })
