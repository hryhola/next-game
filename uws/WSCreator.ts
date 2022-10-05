import uws from 'uWebSockets.js'
import util from 'util'
import handlers from './api'
import { AbstractSocketMessage, Channel, Res } from './uws.types'
import { channel } from './channel'

export const PORT = 5555

export const createSocketApp = () => {
    const decoder = new util.TextDecoder()

    const app = uws.App().ws('/*', {
        open: _ws => {
            console.log('new connected')
        },
        message: (ws, message) => {
            try {
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

                const request: AbstractSocketMessage = JSON.parse(decodedMsg)

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

                const response: Res = {
                    publish(channel: Channel, message: AbstractSocketMessage) {
                        console.log('publishing to', channel, message)
                        app.publish(channel, JSON.stringify(message))
                    },
                    send<T>(data: T) {
                        ws.send(
                            JSON.stringify({
                                ctx: request.ctx,
                                data
                            })
                        )
                    },
                    ws
                }

                console.log(request)

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

    app.listen(PORT, listenSocket => {
        if (listenSocket) {
            console.log('Listening to port ' + PORT)
        }
    })

    return app
}
