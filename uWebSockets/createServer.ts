import uws from 'uWebSockets.js'

import WSHandler from './ws'
import PostHandler from './post'

import sslPath from '../ssl-path'

export const WS_PORT = 5555

export const createSocketServer = () => {
    console.log('Creating UWS server on port', WS_PORT)

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
            console.log('UWS Listening to port ' + WS_PORT)
        } else {
            console.log('wtf UWS not listening')
        }
    })

    return app
}
