import uws from 'uWebSockets.js'
import util from 'util'
import { AbstractSocketMessage, ResponseActions } from '../uws.types'
import logger from 'logger'
import { WSMessageResponseActions } from 'uWebSockets/utils/ws/wrappers'
import { State } from 'state'

// @index('./*.ts', f => `import { handler as ${f.name.replaceAll('-', '')} } from '${f.path}'`)
import { handler as AuthLogin } from './Auth-Login'
import { handler as AuthLogout } from './Auth-Logout'
import { handler as AuthRegister } from './Auth-Register'
import { handler as ChatGet } from './Chat-Get'
import { handler as ChatSend } from './Chat-Send'
import { handler as LobbyGetList } from './Lobby-GetList'
import { handler as LobbyGetPublicInfo } from './Lobby-GetPublicInfo'
import { handler as LobbyStartReadyCheck } from './Lobby-StartReadyCheck'
import { handler as LobbyTip } from './Lobby-Tip'
import { handler as UniversalSubscription } from './Universal-Subscription'
import { handler as UsersGet } from './Users-Get'
import { handler as UsersGetCount } from './Users-GetCount'
// @endindex

export const handlers = {
    // @index('./*.ts', f => `'${f.name}': ${f.name.replaceAll('-', '')},`)
    'Auth-Login': AuthLogin,
    'Auth-Logout': AuthLogout,
    'Auth-Register': AuthRegister,
    'Chat-Get': ChatGet,
    'Chat-Send': ChatSend,
    'Lobby-GetList': LobbyGetList,
    'Lobby-GetPublicInfo': LobbyGetPublicInfo,
    'Lobby-StartReadyCheck': LobbyStartReadyCheck,
    'Lobby-Tip': LobbyTip,
    'Universal-Subscription': UniversalSubscription,
    'Users-Get': UsersGet,
    'Users-GetCount': UsersGetCount
    // @endindex
}

export type HandlerName = keyof typeof handlers

export const WSHandlerRegister = (app: uws.TemplatedApp, state: State) => {
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
                    const user = state.users.getByConnection(ws)

                    if (user) {
                        user.refreshOnlineChecker()
                    }

                    return ws.send('pong')
                }

                const request: AbstractSocketMessage<HandlerName, never> = JSON.parse(decodedMsg)

                if (request.token) {
                    const user = state.users.getByToken(request.token)

                    if (user && user.ws !== ws) {
                        user.ws = ws
                    }
                }

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

                const response: ResponseActions = new WSMessageResponseActions(app, ws, request)

                logger.info(request, 'Retrieved message')

                handlers[request.ctx](response, state, request.data, request.token)
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
        close: (ws, code, message) => {
            const user = state.users.getByConnection(ws)

            user?.update({ isOnline: false })

            const decodedMsg = new util.TextDecoder().decode(message)

            logger.info(
                {
                    message: decodedMsg,
                    code,
                    user: user?.data()
                },
                'Closing connection'
            )
        }
    })
}
