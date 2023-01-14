import { URL } from './const'
import { WebSocketCallbacks } from './types'

export const startSocketServer = () => fetch(URL.SocketStartStarter)

const messageLogger = (message: MessageEvent<any>) => {
    if (message.data === 'pong') {
        return
    }

    try {
        const parsed = JSON.parse(message.data)

        console.log('%c' + parsed.ctx + ' %cget', 'color: aqua', '', parsed.data)
    } catch (e) {
        console.log('%cget > ' + message.data, 'color: red')
    }
}

// In theory should contain only one timer
const pingIntervals: NodeJS.Timer[] = []

let isHandlingConnectRequest = false

export const connectToWebSocket = async (callbacks?: WebSocketCallbacks) => {
    console.log(process.env.NODE_ENV)

    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    isHandlingConnectRequest = true

    return startSocketServer()
        .catch(e => console.log('UWS Init error', e))
        .then(() => {
            console.log('WS url is', URL.WS)

            const ws = new WebSocket(URL.WS)

            ws.onopen = () => {
                ws.addEventListener('message', messageLogger)

                callbacks?.onOpen(ws!)

                pingIntervals.push(setInterval(() => ws.send('ping'), 2000))
            }

            ws.onclose = () => {
                let i: NodeJS.Timer

                while (pingIntervals.length) {
                    i = pingIntervals.pop()!

                    clearInterval(i)
                }

                console.log('websocket closed')
                callbacks?.onClose()
            }

            ws.onerror = e => {
                console.error('WS Error', e)
                callbacks?.onError()
            }

            isHandlingConnectRequest = false
        })
}
