import { useRef, useState } from 'react'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { useWS } from 'client/context/list'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { Backdrop, Box, Button } from '@mui/material'

type Props = {
    children: JSX.Element | JSX.Element[]
}

export const WsApp: React.FC<Props> = props => {
    const ws = useWS()

    const isFirstConnection = useRef(true)
    const [isHandlingConnection, setIsHandlingConnection] = useState(false)

    const startConnecting = () => {
        setIsHandlingConnection(true)

        isFirstConnection.current = false

        if (isHandlingConnection) {
            console.log('Already connecting.')
            return
        }

        connectToWebSocket({
            onClose: () => ws.setIsConnected(false),
            onError: () => ws.setIsConnected(false),
            onOpen: (webSocket: WebSocket) => {
                console.log('Connection is set.')
                ws.wsRef.current = webSocket
                ws.setIsConnected(true)

                setIsHandlingConnection(false)
            }
        })
    }

    return (
        <>
            {props.children}
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
                open={!isHandlingConnection && !ws.isConnected}
            >
                <Box sx={{ display: 'flex', flexFlow: 'column' }}>
                    {isFirstConnection.current ? 'Connect to the game server to join' : 'Connection to the server is lost.'}
                    <Button sx={{ mt: 4 }} variant="contained" color="secondary" onClick={() => startConnecting()}>
                        {isFirstConnection.current ? 'connect' : 'reconnect'}
                    </Button>
                </Box>
            </Backdrop>
        </>
    )
}
