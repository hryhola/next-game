import uws from 'uWebSockets.js'
import util from 'util'
import { AbstractSocketMessage, ResponseActions } from '../uws.types'

// @index('./*', f => `import { handler as ${f.name.replaceAll('-', '')} } from '${f.path}'`)
import { handler as AuthLogin } from './Auth-Login'
import { handler as AuthLogout } from './Auth-Logout'
import { handler as GlobalChatGet } from './Global-ChatGet'
import { handler as GlobalChatSend } from './Global-ChatSend'
import { handler as GlobalOnlineGet } from './Global-OnlineGet'
import { handler as GlobalSubscribe } from './Global-Subscribe'
import { handler as GlobalUsersGet } from './Global-UsersGet'
import { handler as LobbyCreate } from './Lobby-Create'
import { handler as LobbyGetList } from './Lobby-GetList'
// @endindex

export const handlers = {
    // @index('./*', f => `'${f.name}': ${f.name.replaceAll('-', '')},`)
    'Auth-Login': AuthLogin,
    'Auth-Logout': AuthLogout,
    'Global-ChatGet': GlobalChatGet,
    'Global-ChatSend': GlobalChatSend,
    'Global-OnlineGet': GlobalOnlineGet,
    'Global-Subscribe': GlobalSubscribe,
    'Global-UsersGet': GlobalUsersGet,
    'Lobby-Create': LobbyCreate,
    'Lobby-GetList': LobbyGetList
    // @endindex
}

export type HandlerName = keyof typeof handlers

const WSHandler = (app: uws.TemplatedApp) => {
    app.ws('/ws', {
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
                    publishGlobal(channelCtx: string, data: any) {
                        const message: AbstractSocketMessage = {
                            ctx: channelCtx,
                            data
                        }

                        console.log('publishing global event to', channelCtx, data)

                        app.publish(channelCtx, JSON.stringify(message))
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

                console.log('Retrieved message:', request)

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
}

export default WSHandler
