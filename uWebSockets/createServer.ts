import uws from 'uWebSockets.js'

import WSHandler from './ws'
import PostHandler from './post'

import sslPath from '../ssl-path'
import logger from 'logger'

export const WS_PORT = 5555

export const createSocketServer = () => {
    logger.info('Creating uWebSockets server on port: ' + WS_PORT)

    let app: uws.TemplatedApp

    if (process.env.NODE_ENV === 'production') {
        app = uws.SSLApp({
            key_file_name: sslPath.keyPath,
            cert_file_name: sslPath.certPath
        })
    } else {
        app = uws.App()
    }

    WSHandler(app)
    PostHandler(app)

    app.listen(WS_PORT, listenSocket => {
        if (listenSocket) {
            logger.info('uWebSockets server listening on port: ' + WS_PORT)
        } else {
            logger.error('wtf uWebSockets not listening')
        }
    })

    return app
}
