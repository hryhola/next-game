import { startTransition, useEffect, useRef, useState } from 'react'
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
    const { wsRef: roomSocketRef, setIsConnected: setConnected, isConnected } = useWS()
    const lobby = useLobby()
    const user = useUser()
    const router = useClientRouter()

    const isFirstConnection = useRef(true)
    const pendingSocketRef = useRef<WebSocket | null>(null)
    const connectionAttemptRef = useRef(0)
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
        connectionAttemptRef.current += 1
        clearReconnectTimeout()

        const socketsToClose = [pendingSocketRef.current, roomSocketRef.current].filter((socket): socket is WebSocket => Boolean(socket))

        pendingSocketRef.current = null
        roomSocketRef.current = null

        for (const socket of socketsToClose) {
            try {
                socket.close()
            } catch (_error) {
                continue
            }
        }

        if (resetTarget) {
            currentTargetUrl.current = null
            currentIdentityKeyRef.current = null
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

        if (pendingSocketRef.current || roomSocketRef.current) {
            closeSocket(false)
        }

        updateHandlingConnection(true)
        clearReconnectTimeout()

        isFirstConnection.current = false
        const attemptId = ++connectionAttemptRef.current

        const socket = connectToWebSocket({
            pingMessage: JSON.stringify({ type: 'ping' }),
            onClose: (closedSocket: WebSocket) => {
                if (pendingSocketRef.current === closedSocket) {
                    pendingSocketRef.current = null
                }

                const isCurrentAttempt = attemptId === connectionAttemptRef.current
                const isCurrentSocket = roomSocketRef.current === closedSocket

                if (!isCurrentAttempt && !isCurrentSocket) {
                    return
                }

                if (isCurrentSocket) {
                    roomSocketRef.current = null
                }

                setConnected(false)
                updateHandlingConnection(false)

                if (!isCurrentAttempt) {
                    return
                }

                currentIdentityKeyRef.current = null

                if (shouldReconnectRef.current && currentTargetUrl.current === targetUrl && pendingSocketRef.current === null) {
                    scheduleReconnect()
                }
            },
            onError: (erroredSocket: WebSocket) => {
                if (pendingSocketRef.current === erroredSocket) {
                    pendingSocketRef.current = null
                }

                const isCurrentAttempt = attemptId === connectionAttemptRef.current
                const isCurrentSocket = roomSocketRef.current === erroredSocket

                if (!isCurrentAttempt && !isCurrentSocket) {
                    return
                }

                if (isCurrentSocket) {
                    roomSocketRef.current = null
                }

                setConnected(false)
                updateHandlingConnection(false)

                if (!isCurrentAttempt) {
                    return
                }

                currentIdentityKeyRef.current = null

                if (shouldReconnectRef.current && currentTargetUrl.current === targetUrl && pendingSocketRef.current === null) {
                    scheduleReconnect()
                }
            },
            onOpen: (webSocket: WebSocket) => {
                if (attemptId !== connectionAttemptRef.current) {
                    try {
                        webSocket.close()
                    } catch (_error) {
                        return
                    }

                    return
                }

                console.log('Connection is set.')
                pendingSocketRef.current = null
                roomSocketRef.current = webSocket
                currentTargetUrl.current = targetUrl
                currentIdentityKeyRef.current = identityKey
                setConnected(true)
                clearReconnectTimeout()

                if (!isFirstConnection.current) {
                    setTimeout(() => webSocket.send(JSON.stringify({ type: 'ping' })), 0)
                }

                updateHandlingConnection(false)
            },
            url: targetUrl
        })

        pendingSocketRef.current = socket
    }

    useEffect(() => {
        const requiresLobbySocket = router.frame === 'Lobby' && Boolean(lobby.lobbyId)
        shouldReconnectRef.current = requiresLobbySocket

        if (!requiresLobbySocket) {
            closeSocket()
            startTransition(() => {
                setConnected(true)
                updateHandlingConnection(false)
            })
            isFirstConnection.current = false
            return
        }

        const token = getCookie('token')

        if (typeof token !== 'string' || !token.length) {
            shouldReconnectRef.current = false
            closeSocket()
            startTransition(() => {
                setConnected(false)
            })
            return
        }

        const targetUrl = getCloudflareLobbyWebSocketUrl(lobby.lobbyId, token)
        const currentSocket = roomSocketRef.current
        const sameIdentity = currentIdentityKeyRef.current === identityKey

        if (currentSocket && currentTargetUrl.current === targetUrl && currentSocket.readyState === WebSocket.OPEN && sameIdentity) {
            clearReconnectTimeout()
            setConnected(true)
            return
        }

        if (currentSocket && (currentTargetUrl.current !== targetUrl || !sameIdentity)) {
            closeSocket()
        }

        currentTargetUrl.current = targetUrl
        startTransition(() => {
            setConnected(false)
        })

        if (!isHandlingConnectionRef.current) {
            startConnecting(targetUrl)
        }
    }, [identityKey, lobby.lobbyId, router.frame])

    useEffect(() => {
        return () => {
            shouldReconnectRef.current = false
            clearReconnectTimeout()
            closeSocket()
            setConnected(false)
        }
    }, [])

    const shouldShowBackdrop = router.frame === 'Lobby' && !isHandlingConnection && !isConnected

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
