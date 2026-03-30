import { WebSocketCallbacks } from './types'

const messageLogger = (message: MessageEvent<any>) => {
    if (message.data === 'pong') {
        return
    }

    try {
        const parsed = JSON.parse(message.data)

        if (parsed?.type === 'pong') {
            return
        }

        if (typeof parsed?.ctx === 'string') {
            console.log('%c' + parsed.ctx + ' %cget', 'color: aqua', '', parsed.data)
            return
        }

        if (typeof parsed?.type === 'string') {
            console.log('%c' + parsed.type + ' %cget', 'color: aqua', '', 'payload' in parsed ? parsed.payload : parsed)
            return
        }

        console.log('%cget', 'color: aqua', parsed)
    } catch (e) {
        console.log('%cget > ' + message.data, 'color: red')
    }
}

// In theory should contain only one timer
const pingIntervals: Array<ReturnType<typeof setInterval>> = []

let isHandlingConnectRequest = false

export const connectToWebSocket = async (callbacks?: WebSocketCallbacks) => {
    console.log(process.env.NODE_ENV)

    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    isHandlingConnectRequest = true

    const socketUrl = callbacks?.url

    if (!socketUrl) {
        throw new Error('WebSocket URL is required')
    }

    console.log('WS url is', socketUrl)

    const ws = new WebSocket(socketUrl)

    ws.onopen = () => {
        ws.addEventListener('message', messageLogger)

        callbacks?.onOpen(ws!)

        pingIntervals.push(setInterval(() => ws.send(callbacks?.pingMessage || 'ping'), 2000))
    }

    ws.onclose = () => {
        let i: ReturnType<typeof setInterval>

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
}
