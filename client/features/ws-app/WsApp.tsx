import { useContext, useEffect, useRef, useState } from 'react'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { WSContext } from 'client/context/list/ws'
import { sleep } from 'util/time'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { UserContext } from 'client/context/list/user'
import { RouterContext } from 'client/context/list/router'
import { Backdrop, Box, Button } from '@mui/material'

type Props = {
    children: JSX.Element | JSX.Element[]
}

export const WsApp: React.FC<Props> = props => {
    const ws = useContext(WSContext)

    const [isHandlingConnection, setIsHandlingConnection] = useState(false)

    const startConnecting = () => {
        if (isHandlingConnection) {
            console.log('Already connecting.')
            return
        }

        setIsHandlingConnection(true)

        connectToWebSocket({
            onClose: () => ws.setIsConnected(false),
            onError: () => ws.setIsConnected(false),
            onOpen: (webSocket: WebSocket) => {
                console.log('Connection is set.')
                ws.wsRef.current = webSocket
                ws.setIsConnected(true)
            }
        }).then(() => {
            setIsHandlingConnection(false)
        })
    }

    useEffect(() => {
        startConnecting()
    }, [])

    return (
        <>
            {props.children}
            <DevToolsOverlay />
            <LoadingOverlay text="connecting..." isLoading={isHandlingConnection} />
            <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={!isHandlingConnection && !ws.isConnected}>
                <Box sx={{ display: 'flex', flexFlow: 'column' }}>
                    Connection to the server is lost.
                    <Button sx={{ mt: 4 }} variant="contained" color="secondary" onClick={() => startConnecting()}>
                        reconnect
                    </Button>
                </Box>
            </Backdrop>
        </>
    )
}
