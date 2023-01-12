type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

const getSocketInitUrl = (location: Location) => {
    if (location.protocol.includes('https')) {
        return `https://${location.hostname}/api/init`
    } else {
        return `http://${location.hostname}:3000/api/init`
    }
}
const getWSUrl = (location: Location) => {
    if (location.protocol.includes('https')) {
        return `wss://${location.hostname}/ws/`
    } else {
        return `ws://${location.hostname}:5555/ws`
    }
}

export const initUWS = (location: Location) => fetch(getSocketInitUrl(location)).then(res => res.json())

let isHandlingConnectRequest = false

export const connectToWebSocket = async (location: Location, callbacks?: WebSocketCallbacks) => {
    console.log(process.env.NODE_ENV)

    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    isHandlingConnectRequest = true

    return initUWS(location)
        .catch(e => console.log('UWS Init error', e))
        .then(() => {
            const url = getWSUrl(location)

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
