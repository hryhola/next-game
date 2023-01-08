type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

export const initUWS = (siteLink: string) => fetch(`http://${siteLink}/api/init`).then(res => res.json())

let isHandlingConnectRequest = false

export const connectToWebSocket = async (hostname: string, port: string, callbacks?: WebSocketCallbacks) => {
    console.log(process.env.NODE_ENV)

    if (isHandlingConnectRequest) {
        console.log('Already handling connecting request. Exiting.')

        return
    }

    const siteLink = hostname + (port ? ':' + port : '')

    isHandlingConnectRequest = true

    return initUWS(siteLink)
        .catch(e => console.log('UWS Init error', e))
        .then(({ port }) => {
            const url = `ws://${hostname}:${port}`

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
