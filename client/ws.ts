type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

export const initUWS = (hostname: string) => fetch(`https://${hostname}/api/init`).then(res => res.json())

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
        .then(({ port }) => {
            const url = `wss://${hostname}/ws`

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
