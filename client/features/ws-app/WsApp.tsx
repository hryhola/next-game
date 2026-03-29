import { useEffect, useRef, useState } from 'react'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { useLobby, useWS } from 'client/context/list'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { Backdrop, Box, Button } from '@mui/material'
import { useClientRouter } from 'client/route/ClientRouter'
import { getCloudflareRoomWebSocketUrl, isCloudflareRealtimeEnabled } from 'client/network-utils/realtimeMode'
import { getCookie } from 'cookies-next'

type Props = {
    children: JSX.Element | JSX.Element[]
}

export const WsApp: React.FC<Props> = props => {
    const ws = useWS()
    const lobby = useLobby()
    const router = useClientRouter()
    const isWorkerMode = isCloudflareRealtimeEnabled()

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
            pingMessage: isWorkerMode ? JSON.stringify({ type: 'ping' }) : 'ping',
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
                    setTimeout(() => webSocket.send(isWorkerMode ? JSON.stringify({ type: 'ping' }) : 'ping'), 0)
                }

                updateHandlingConnection(false)
            },
            url: targetUrl
        })
    }

    useEffect(() => {
        if (!isWorkerMode) {
            return
        }

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
    }, [isWorkerMode, lobby.lobbyId, router.frame])

    const showChildren = isWorkerMode || !isFirstConnection.current
    const shouldShowBackdrop = isWorkerMode ? router.frame === 'Lobby' && !isHandlingConnection && !ws.isConnected : !isHandlingConnection && !ws.isConnected

    return (
        <>
            {showChildren && props.children}
            <DevToolsOverlay />
            <LoadingOverlay transitionDuration={0} text="connecting..." isLoading={isHandlingConnection} />
            <Backdrop
                transitionDuration={0}
                sx={{
                    zIndex: theme => theme.zIndex.drawer + 1,
                    ...(isFirstConnection.current
                        ? {
                              background: 'black'
                          }
                        : {})
                }}
                open={shouldShowBackdrop}
            >
                <Box sx={{ display: 'flex', flexFlow: 'column' }}>
                    {isWorkerMode
                        ? 'Connect to the room server to continue.'
                        : isFirstConnection.current
                        ? 'Connect to the game server to join'
                        : 'Connection to the server is lost.'}
                    <Button sx={{ mt: 4 }} variant="contained" color="secondary" onClick={() => startConnecting(currentTargetUrl.current || undefined)}>
                        {isWorkerMode ? 'reconnect' : isFirstConnection.current ? 'connect' : 'reconnect'}
                    </Button>
                </Box>
            </Backdrop>
        </>
    )
}
