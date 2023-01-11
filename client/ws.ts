type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

const getSocketInitUrl = (hostname: string) => {
    if (process.env.NODE_ENV === 'production') {
        return `https://${hostname}/api/init`
    } else {
        return `http://${hostname}:3000/api/init`
    }
}
const getWSUrl = (hostname: string) => {
    if (process.env.NODE_ENV === 'production') {
        return `wss://${hostname}/ws`
    } else {
        return `ws://${hostname}:5555/ws`
    }
}

export const initUWS = (hostname: string) => fetch(getSocketInitUrl(hostname)).then(res => res.json())

let isHandlingConnectRequest = false

export const connectToWebSocket = async (hostname: string, callbacks?: WebSocketCallbacks) => {
    console.log(process.env.NODE_ENV)

    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    isHandlingConnectRequest = true

    return initUWS(hostname)
        .catch(e => console.log('UWS Init error', e))
        .then(() => {
            const url = getWSUrl(hostname)

            console.log('WS url is', url)

            const ws = new WebSocket(url)

            ws.onopen = () => {
                ws.addEventListener('message', m => console.log(m))

                callbacks?.onOpen(ws!)
            }

            ws.onclose = () => {
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
