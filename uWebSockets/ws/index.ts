import uws from 'uWebSockets.js'
import util from 'util'
import { AbstractSocketMessage, ResponseActions } from '../uws.types'
import logger from 'logger'

// @index('./*.ts', f => `import { handler as ${f.name.replaceAll('-', '')} } from '${f.path}'`)
import { handler as AuthLogin } from './Auth-Login'
import { handler as AuthLogout } from './Auth-Logout'
import { handler as AuthRegister } from './Auth-Register'
import { handler as GlobalSubscribe } from './Global-Subscribe'
import { handler as GlobalUnsubscribe } from './Global-Unsubscribe'
import { handler as GlobalChatGet } from './GlobalChat-Get'
import { handler as GlobalChatSend } from './GlobalChat-Send'
import { handler as GlobalOnlineGetUsers } from './GlobalOnline-GetUsers'
import { handler as GlobalOnlineGetUsersCount } from './GlobalOnline-GetUsersCount'
import { handler as LobbyCreate } from './Lobby-Create'
import { handler as LobbyGetList } from './Lobby-GetList'
// @endindex

export const handlers = {
    // @index('./*.ts', f => `'${f.name}': ${f.name.replaceAll('-', '')},`)
    'Auth-Login': AuthLogin,
    'Auth-Logout': AuthLogout,
    'Auth-Register': AuthRegister,
    'Global-Subscribe': GlobalSubscribe,
    'Global-Unsubscribe': GlobalUnsubscribe,
    'GlobalChat-Get': GlobalChatGet,
    'GlobalChat-Send': GlobalChatSend,
    'GlobalOnline-GetUsers': GlobalOnlineGetUsers,
    'GlobalOnline-GetUsersCount': GlobalOnlineGetUsersCount,
    'Lobby-Create': LobbyCreate,
    'Lobby-GetList': LobbyGetList
    // @endindex
}

export type HandlerName = keyof typeof handlers

const WSHandler = (app: uws.TemplatedApp) => {
    logger.debug('Registering handling for WS connection type')

    app.ws('/ws', {
        open: _ws => {
            logger.info('New websocket connection')
        },
        message: (ws, message) => {
            try {
                const decoder = new util.TextDecoder()

                const decodedMsg = decoder.decode(message)

                if (!message || !decodedMsg) {
                    logger.warn({ decodedMsg }, 'Request body is missing')

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
                    logger.warn({ decodedMsg }, 'Request context is missing')

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
                    logger.warn({ decodedMsg }, `Handler for context is '${request.ctx}' missing`)

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
                        const messageString = JSON.stringify(message)

                        logger.info(`publishing to ${channel} ${messageString}`)

                        app.publish(channel, messageString)
                    },
                    publishGlobal(channelCtx: string, data: any) {
                        const message: AbstractSocketMessage = {
                            ctx: channelCtx,
                            data
                        }

                        logger.info(data, `publishing global event to ${channelCtx}`)

                        app.publish(channelCtx, JSON.stringify(message))
                    },
                    res<T>(data: T) {
                        logger.info(data, 'Responding to ' + request.ctx)
                        ws.send(
                            JSON.stringify({
                                ctx: request.ctx,
                                data
                            })
                        )
                    },
                    send<T>(ctx: string, data: T) {
                        logger.info(data, 'Sending to ' + ctx)
                        ws.send(
                            JSON.stringify({
                                ctx: ctx,
                                data
                            })
                        )
                    },
                    ws
                }

                logger.info(request, 'Retrieved message')

                handlers[request.ctx](response, request.data, request.token)
            } catch (e) {
                const message = e instanceof Error ? e.message : (e as string)

                logger.error(e, 'Internal error while socket message handling')

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
            logger.info(message, 'Closing connection. Code: ' + code)
        }
    })
}

export default WSHandler
