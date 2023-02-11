import uws, { TemplatedApp } from 'uWebSockets.js'

import { WSHandlerRegister } from './ws'
import { RestHandlersRegister } from './rest'

import sslPath from '../ssl-path'
import logger from 'logger'
import { State } from 'state'
import Publisher from './utils/ws/Publisher'
import { NextApiResponseUWS } from 'util/t'

export const port = Number(process.env.NEXT_PUBLIC_WS_PORT)

const createSocketServer = (): [TemplatedApp, State] => {
    let app: uws.TemplatedApp

    if (process.env.NODE_ENV === 'production') {
        logger.info('Creating SSL uWebSockets server on port: ' + port)

        app = uws.SSLApp({
            key_file_name: sslPath.keyPath,
            cert_file_name: sslPath.certPath
        })
    } else {
        logger.info('Creating uWebSockets server on port: ' + port)

        app = uws.App()
    }

    const state = new State(new Publisher(app))

    WSHandlerRegister(app, state)
    RestHandlersRegister(app, state)

    app.listen(port, listenSocket => {
        if (listenSocket) {
            logger.info('uWebSockets server listening on port: ' + port)
        } else {
            logger.error({ listenSocket }, 'wtf uWebSockets not listening')
        }
    })

    return [app, state]
}

export const initializeSocketServer = (res: NextApiResponseUWS) => {
    if (res.socket.server.uws) {
        logger.debug('Socket is already running')

        return
    }

    logger.info('Socket is initializing')

    const [uws, state] = createSocketServer()

    res.socket.server.uws = uws
    res.socket.server.appState = state
}
