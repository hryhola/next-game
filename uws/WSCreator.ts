import uws from 'uWebSockets.js'
import util from 'util'
import handlers from './api'
import { AbstractSocketMessage, PublishContext, Res } from './uws.types'

export const PORT = 5555

export const createSocketApp = () => {
    const decoder = new util.TextDecoder()
    const ROOM1 = 'ROOM1'

    const app = uws.App().ws('/*', {
        open: ws => {
            ws.subscribe(ROOM1)
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
                    publish(publishCtx: PublishContext, message: AbstractSocketMessage) {
                        ws.publish(publishCtx, JSON.stringify(message))
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
