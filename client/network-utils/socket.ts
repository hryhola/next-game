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

export const connectToWebSocket = (callbacks?: WebSocketCallbacks): WebSocket => {
    console.log(process.env.NODE_ENV)

    const socketUrl = callbacks?.url

    if (!socketUrl) {
        throw new Error('WebSocket URL is required')
    }

    console.log('WS url is', socketUrl)

    const ws = new WebSocket(socketUrl)
    let pingInterval: ReturnType<typeof setInterval> | null = null

    ws.onopen = () => {
        ws.addEventListener('message', messageLogger)

        callbacks?.onOpen(ws)

        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(callbacks?.pingMessage || 'ping')
            }
        }, 2000)
    }

    ws.onclose = event => {
        if (pingInterval) {
            clearInterval(pingInterval)
            pingInterval = null
        }

        console.log('websocket closed')
        callbacks?.onClose(ws, event)
    }

    ws.onerror = e => {
        console.error('WS Error', e)
        callbacks?.onError(ws, e)
    }

    return ws
}
