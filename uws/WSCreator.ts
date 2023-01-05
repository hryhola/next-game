import uws from 'uWebSockets.js'
import util from 'util'
import handlers, { HandlerName } from './api'
import { AbstractSocketMessage, ResponseActions } from './uws.types'

export const PORT = Number(process.env.PORT) || 5555

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

    app.listen(PORT, listenSocket => {
        if (listenSocket) {
            console.log('Listening to port ' + PORT)
        }
    })

    return app
}
