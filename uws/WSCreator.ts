import uws from 'uWebSockets.js'
import util from 'util'
import { login } from './api'

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
            const decodedMsg = decoder.decode(message)

            console.log(decodedMsg)

            const request = JSON.parse(decodedMsg)

            if (request.ctx === 'login') {
                login(ws, request.data)
            }
        },
        close: (ws, code, message) => {
            //  code
        }
    })

    app.listen(PORT, listenSocket => {
        if (listenSocket) {
            console.log('Listening to port ' + PORT)
        }
    })

    return app
}
