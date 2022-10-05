declare global {
    interface Window {
        ws?: WebSocket
        isConnected: boolean
    }
}

type WebSocketCallbacks = { onClose: () => void; onOpen: (ws: WebSocket) => void; onError: () => void }

export const initUWS = () => fetch('http://localhost:3000/api/init')

export const connectToWebSocket = async (callbacks?: WebSocketCallbacks) =>
    initUWS()
        .catch(e => console.log('UWS Init error', e))
        .finally(() => {
            const url = 'ws://localhost:5555'

            if (window.ws) {
                console.log('ws already exist. exiting connect function.')

                return
            }

            window.ws = new WebSocket(url)

            window.ws.onopen = () => {
                window.isConnected = true

                window.ws?.addEventListener('message', m => console.log(m))

                callbacks?.onOpen(window.ws!)
            }

            window.ws.onclose = () => {
                console.log('websocket closed')
                window.isConnected = false
                callbacks?.onClose()
            }

            window.ws.onerror = e => {
                window.isConnected = false
                console.error('WS Error', e)
                callbacks?.onClose()
            }
        })

export const terminateWS = () => {
    console.log('terminating connection')

    if (window.ws) {
        window.ws.close()

        delete window.ws
    }
}
