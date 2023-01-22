import { useContext, useEffect, useRef } from 'react'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { WSContext } from 'client/context/list/ws'
import { sleep } from 'util/time'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { UserContext } from 'client/context/list/user'
import { RouterContext } from 'client/context/list/router'

let isConnecting = false

type Props = {
    children: JSX.Element | JSX.Element[]
}

export const WsApp: React.FC<Props> = props => {
    const ws = useContext(WSContext)

    useEffect(() => {
        if (isConnecting) {
            console.log('Already connecting. Exiting init hook.')
            return
        }

        isConnecting = true

        connectToWebSocket({
            onClose: () => ws.setIsConnected(false),
            onError: () => ws.setIsConnected(false),
            onOpen: (webSocket: WebSocket) => {
                console.log('Connection is set.')
                ws.wsRef.current = webSocket
                ws.setIsConnected(true)
            }
        }).then(() => {
            isConnecting = false
        })
    }, [])

    useEffect(() => {
        if (ws.isConnected === false) {
            if (isConnecting) {
                console.log('Already connecting. Exiting retry hook.')
                return
            }

            const retry = async () => {
                ws.wsRef.current = null

                isConnecting = true

                console.log('trying to establish connection')

                await connectToWebSocket({
                    onOpen: (webSocket: WebSocket) => {
                        console.log('Connection is set.')
                        ws.wsRef.current = webSocket
                        ws.setIsConnected(true)
                    },
                    onError: async () => {
                        ws.setIsConnected(false)
                        console.log('connection error')

                        await sleep(1000)

                        console.log('trying to reconnect...')

                        await retry()
                    },
                    onClose: async () => {
                        ws.setIsConnected(false)
                        console.log('connection closet')

                        await sleep(1000)

                        console.log('trying to reconnect...')

                        await retry()
                    }
                }).then(() => {
                    isConnecting = false
                })
            }

            retry()
        }
    }, [ws.isConnected])

    return (
        <>
            {props.children}
            <DevToolsOverlay />
            <LoadingOverlay isLoading={!ws.isConnected} text="connecting..." />
        </>
    )
}
