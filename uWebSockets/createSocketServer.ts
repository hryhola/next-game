import uws from 'uWebSockets.js'

import WSHandler from './ws'
import PostHandler from './post'
import GetHandler from './get'

import sslPath from '../ssl-path'
import logger from 'logger'

export const port = Number(process.env.NEXT_PUBLIC_WS_PORT)

export const createSocketServer = () => {
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

    WSHandler(app)
    PostHandler(app)
    GetHandler(app)

    app.listen(port, listenSocket => {
        if (listenSocket) {
            logger.info('uWebSockets server listening on port: ' + port)
        } else {
            logger.error({ listenSocket }, 'wtf uWebSockets not listening')
        }
    })

    return app
}
