import uws from 'uWebSockets.js'

import { WSHandlerRegister } from './ws'
import { RestHandlersRegister } from './rest'
import { ReactionsRegister } from './reactions'

import sslPath from '../ssl-path'
import logger from 'logger'
import { State } from 'state'
import { ReactionActions } from './utils/reactions'

export const port = Number(process.env.NEXT_PUBLIC_WS_PORT)

export const createSocketServer = () => {
    const state = new State()

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

    WSHandlerRegister(app, state)
    RestHandlersRegister(app, state)
    ReactionsRegister(new ReactionActions(app), state)

    app.listen(port, listenSocket => {
        if (listenSocket) {
            logger.info('uWebSockets server listening on port: ' + port)
        } else {
            logger.error({ listenSocket }, 'wtf uWebSockets not listening')
        }
    })

    return app
}
