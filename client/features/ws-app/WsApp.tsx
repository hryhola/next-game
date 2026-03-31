import { useEffect, useRef, useState } from 'react'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { useLobby, useUser, useWS } from 'client/context/list'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { useClientRouter } from 'client/route/ClientRouter'
import { getCloudflareLobbyWebSocketUrl } from 'client/network-utils/realtimeMode'
import { getCookie } from 'cookies-next'
import { Button } from 'client/ui/primitives'

type Props = {
    children: React.ReactNode
}

export const WsApp: React.FC<Props> = props => {
    const ws = useWS()
    const lobby = useLobby()
    const user = useUser()
    const router = useClientRouter()
    const roomSocketRef = ws.wsRef
    const setConnected = ws.setIsConnected

    const isFirstConnection = useRef(true)
    const currentTargetUrl = useRef<string | null>(null)
    const currentIdentityKeyRef = useRef<string | null>(null)
    const isHandlingConnectionRef = useRef(false)
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const shouldReconnectRef = useRef(false)
    const [isHandlingConnection, setIsHandlingConnection] = useState(false)
    const identityKey = JSON.stringify([user.id, user.userNickname, user.userColor, user.userAvatarUrl || ''])

    const updateHandlingConnection = (value: boolean) => {
        isHandlingConnectionRef.current = value
        setIsHandlingConnection(value)
    }

    const clearReconnectTimeout = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }
    }

    const closeSocket = (resetTarget: boolean = true) => {
        clearReconnectTimeout()

        if (!ws.wsRef.current) {
            if (resetTarget) {
                currentTargetUrl.current = null
                currentIdentityKeyRef.current = null
            }

            return
        }

        try {
            ws.wsRef.current.close()
        } catch (_error) {
            return
        } finally {
            ws.wsRef.current = null

            if (resetTarget) {
                currentTargetUrl.current = null
                currentIdentityKeyRef.current = null
            }
        }
    }

    const scheduleReconnect = () => {
        clearReconnectTimeout()

        if (!shouldReconnectRef.current || !currentTargetUrl.current) {
            return
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            if (!shouldReconnectRef.current || isHandlingConnectionRef.current) {
                return
            }

            startConnecting(currentTargetUrl.current || undefined)
        }, 1500)
    }

    const startConnecting = (targetUrl?: string) => {
        if (!targetUrl) {
            return
        }

        if (isHandlingConnectionRef.current) {
            console.log('Already connecting.')
            return
        }

        updateHandlingConnection(true)
        clearReconnectTimeout()

        isFirstConnection.current = false

        connectToWebSocket({
            pingMessage: JSON.stringify({ type: 'ping' }),
            onClose: () => {
                ws.wsRef.current = null
                currentIdentityKeyRef.current = null
                ws.setIsConnected(false)
                updateHandlingConnection(false)

                if (shouldReconnectRef.current && currentTargetUrl.current === targetUrl) {
                    scheduleReconnect()
                }
            },
            onError: () => {
                ws.wsRef.current = null
                currentIdentityKeyRef.current = null
                ws.setIsConnected(false)
                updateHandlingConnection(false)

                if (shouldReconnectRef.current && currentTargetUrl.current === targetUrl) {
                    scheduleReconnect()
                }
            },
            onOpen: (webSocket: WebSocket) => {
                console.log('Connection is set.')
                ws.wsRef.current = webSocket
                currentTargetUrl.current = targetUrl
                currentIdentityKeyRef.current = identityKey
                ws.setIsConnected(true)
                clearReconnectTimeout()

                if (!isFirstConnection.current) {
                    setTimeout(() => webSocket.send(JSON.stringify({ type: 'ping' })), 0)
                }

                updateHandlingConnection(false)
            },
            url: targetUrl
        })
    }

    useEffect(() => {
        const requiresLobbySocket = router.frame === 'Lobby' && Boolean(lobby.lobbyId)
        shouldReconnectRef.current = requiresLobbySocket

        if (!requiresLobbySocket) {
            closeSocket()
            ws.setIsConnected(true)
            updateHandlingConnection(false)
            isFirstConnection.current = false
            return
        }

        const token = getCookie('token')

        if (typeof token !== 'string' || !token.length) {
            shouldReconnectRef.current = false
            closeSocket()
            ws.setIsConnected(false)
            return
        }

        const targetUrl = getCloudflareLobbyWebSocketUrl(lobby.lobbyId, token)
        const currentSocket = ws.wsRef.current
        const sameIdentity = currentIdentityKeyRef.current === identityKey

        if (currentSocket && currentTargetUrl.current === targetUrl && currentSocket.readyState === WebSocket.OPEN && sameIdentity) {
            clearReconnectTimeout()
            ws.setIsConnected(true)
            return
        }

        if (currentSocket && (currentTargetUrl.current !== targetUrl || !sameIdentity)) {
            closeSocket()
        }

        currentTargetUrl.current = targetUrl
        ws.setIsConnected(false)

        if (!isHandlingConnectionRef.current) {
            startConnecting(targetUrl)
        }
    }, [identityKey, lobby.lobbyId, router.frame])

    useEffect(() => {
        return () => {
            shouldReconnectRef.current = false
            clearReconnectTimeout()

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
                currentIdentityKeyRef.current = null
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
