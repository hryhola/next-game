import uws from 'uWebSockets.js'
import util from 'util'
import fs from 'fs'
import handlers, { HandlerName } from './api'
import { AbstractSocketMessage, ResponseActions } from './uws.types'
import { state } from 'state'
import { Jeopardy } from 'model/Jeopardy'
import { v4 } from 'uuid'
const multipart = require('parse-multipart-data')

console.log(multipart)

export const WS_PORT = 5555

const getWsHandler = (app: uws.TemplatedApp): uws.WebSocketBehavior => ({
    open: _ws => {
        console.log('new connected')
    },
    message: (ws, message) => {
        try {
            const decoder = new util.TextDecoder()

            const decodedMsg = decoder.decode(message)

            if (!message || !decodedMsg) {
                console.log('Request body is missing', decodedMsg)

                return ws.send(
                    JSON.stringify({
                        ctx: 'request',
                        request: decodedMsg,
                        data: {
                            success: false,
                            message: 'Request body is missing'
                        }
                    })
                )
            }

            if (decodedMsg === 'ping') {
                return ws.send('pong')
            }

            const request: AbstractSocketMessage<HandlerName, never> = JSON.parse(decodedMsg)

            if (!request.ctx) {
                console.log('Request context is missing', decodedMsg)

                return ws.send(
                    JSON.stringify({
                        ctx: 'request',
                        request: decodedMsg,
                        data: {
                            success: false,
                            message: 'Request context is missing'
                        }
                    })
                )
            }

            if (!(request.ctx in handlers)) {
                console.log(`Handler for context is '${request.ctx}' missing`, decodedMsg)

                return ws.send(
                    JSON.stringify({
                        ctx: 'request',
                        request: decodedMsg,
                        data: {
                            success: false,
                            message: `Handler for context '${request.ctx}' is missing`
                        }
                    })
                )
            }

            const response: ResponseActions = {
                publish(channel: string, message: AbstractSocketMessage) {
                    console.log('publishing to', channel, message)

                    app.publish(channel, JSON.stringify(message))
                },
                res<T>(data: T) {
                    console.log('Responding to', request.ctx, data)
                    ws.send(
                        JSON.stringify({
                            ctx: request.ctx,
                            data
                        })
                    )
                },
                send<T>(ctx: string, data: T) {
                    console.log('Sending to', ctx, data)
                    ws.send(
                        JSON.stringify({
                            ctx: ctx,
                            data
                        })
                    )
                },
                ws
            }

            console.log('Get:', request)

            handlers[request.ctx](response, request.data)
        } catch (e) {
            const message = e instanceof Error ? e.message : (e as string)

            console.log('Internal error', e)

            ws.send(
                JSON.stringify({
                    ctx: 'request',
                    data: {
                        success: false,
                        message: 'Internal error',
                        errorMessage: message
                    }
                })
            )
        }
    },
    close: (_ws, code, message) => {
        console.log('Closing connection', code, message)
    }
})

export const createSocketApp = () => {
    console.log('Creating UWS on port:', WS_PORT)

    let app: uws.TemplatedApp

    if (process.env.NODE_ENV === 'production') {
        app = uws.SSLApp({
            key_file_name: '/etc/letsencrypt/live/game-club.click/privkey.pem',
            cert_file_name: '/etc/letsencrypt/live/game-club.click/cert.pem'
        })
    } else {
        app = uws.App()
    }

    app.ws('/ws', getWsHandler(app))

    app.post('/wsapi/lobby-create/jeopardy', async (res, req) => {
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
                lobby: '' // lobby.id
            })
        )
    })

    app.listen(WS_PORT, listenSocket => {
        if (listenSocket) {
            console.log('UWS Listening to port ' + WS_PORT)
        }
    })

    return app
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
