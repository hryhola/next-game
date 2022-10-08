type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

export const initUWS = () => fetch('http://localhost:3000/api/init')

let isHandlingConnectRequest = false

export const connectToWebSocket = async (callbacks?: WebSocketCallbacks) => {
    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    isHandlingConnectRequest = true

    return initUWS()
        .catch(e => console.log('UWS Init error', e))
        .finally(() => {
            const url = 'ws://localhost:5555'

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
