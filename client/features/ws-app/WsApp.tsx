import { useEffect, useRef, useState } from 'react'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { useLobby, useWS } from 'client/context/list'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { useClientRouter } from 'client/route/ClientRouter'
import { getCloudflareRoomWebSocketUrl } from 'client/network-utils/realtimeMode'
import { getCookie } from 'cookies-next'
import { Button } from 'client/ui/primitives'

type Props = {
    children: React.ReactNode
}

export const WsApp: React.FC<Props> = props => {
    const ws = useWS()
    const lobby = useLobby()
    const router = useClientRouter()
    const roomSocketRef = ws.wsRef
    const setConnected = ws.setIsConnected

    const isFirstConnection = useRef(true)
    const currentTargetUrl = useRef<string | null>(null)
    const isHandlingConnectionRef = useRef(false)
    const [isHandlingConnection, setIsHandlingConnection] = useState(false)

    const updateHandlingConnection = (value: boolean) => {
        isHandlingConnectionRef.current = value
        setIsHandlingConnection(value)
    }

    const closeSocket = () => {
        if (!ws.wsRef.current) {
            return
        }

        try {
            ws.wsRef.current.close()
        } catch (_error) {
            return
        } finally {
            ws.wsRef.current = null
            currentTargetUrl.current = null
        }
    }

    const startConnecting = (targetUrl?: string) => {
        if (isHandlingConnectionRef.current) {
            console.log('Already connecting.')
            return
        }

        updateHandlingConnection(true)

        isFirstConnection.current = false

        connectToWebSocket({
            pingMessage: JSON.stringify({ type: 'ping' }),
            onClose: () => {
                ws.wsRef.current = null
                ws.setIsConnected(false)
                updateHandlingConnection(false)
            },
            onError: () => {
                ws.wsRef.current = null
                ws.setIsConnected(false)
                updateHandlingConnection(false)
            },
            onOpen: (webSocket: WebSocket) => {
                console.log('Connection is set.')
                ws.wsRef.current = webSocket
                ws.setIsConnected(true)

                if (!isFirstConnection.current) {
                    setTimeout(() => webSocket.send(JSON.stringify({ type: 'ping' })), 0)
                }

                updateHandlingConnection(false)
            },
            url: targetUrl
        })
    }

    useEffect(() => {
        const requiresRoomSocket = router.frame === 'Lobby' && Boolean(lobby.lobbyId)

        if (!requiresRoomSocket) {
            closeSocket()
            ws.setIsConnected(true)
            updateHandlingConnection(false)
            isFirstConnection.current = false
            return
        }

        const token = getCookie('token')

        if (typeof token !== 'string' || !token.length) {
            ws.setIsConnected(false)
            return
        }

        const targetUrl = getCloudflareRoomWebSocketUrl(lobby.lobbyId, token)
        const currentSocket = ws.wsRef.current

        if (currentSocket && currentTargetUrl.current === targetUrl && currentSocket.readyState === WebSocket.OPEN) {
            ws.setIsConnected(true)
            return
        }

        if (currentSocket && currentTargetUrl.current !== targetUrl) {
            closeSocket()
        }

        currentTargetUrl.current = targetUrl
        ws.setIsConnected(false)

        if (!isHandlingConnectionRef.current) {
            startConnecting(targetUrl)
        }
    }, [lobby.lobbyId, router.frame])

    useEffect(() => {
        return () => {
            if (!roomSocketRef.current) {
                return
            }

            try {
                roomSocketRef.current.close()
            } catch (_error) {
                return
            } finally {
                roomSocketRef.current = null
                currentTargetUrl.current = null
                setConnected(false)
            }
        }
    }, [roomSocketRef, setConnected])

    const shouldShowBackdrop = router.frame === 'Lobby' && !isHandlingConnection && !ws.isConnected

    return (
        <>
            {props.children}
            <DevToolsOverlay />
            <LoadingOverlay transitionDuration={0} text="connecting..." isLoading={isHandlingConnection} />
            {shouldShowBackdrop ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="glass-card flex flex-col gap-4 px-6 py-5 text-center text-slate-100">
                        <p>Connect to the room server to continue.</p>
                        <Button variant="secondary" onClick={() => startConnecting(currentTargetUrl.current || undefined)}>
                            Reconnect
                        </Button>
                    </div>
                </div>
            ) : null}
        </>
    )
}
