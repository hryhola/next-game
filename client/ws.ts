type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

export const initUWS = (siteLink: string) => fetch(`http://${siteLink}/api/init`)

let isHandlingConnectRequest = false

export const connectToWebSocket = async (hostname: string, port: string, callbacks?: WebSocketCallbacks) => {
    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    const siteLink = hostname + (port ? ':' + port : '')

    isHandlingConnectRequest = true

    return initUWS(siteLink)
        .catch(e => console.log('UWS Init error', e))
        .finally(() => {
            const url = `ws://${hostname}:5555`

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
