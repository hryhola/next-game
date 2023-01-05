import { useContext, useEffect } from 'react'
import { NextPage } from 'next'
import { Router } from 'client/features/app/Router'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/ws'
import { WSContext } from 'client/context/list/ws.context'
import { sleep } from 'util/time'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
// import { AnimatedBackground } from 'client/ui/animated-background/AnimatedBackground'

let isConnecting = false

const Home: NextPage = () => {
    const { wsRef, setIsConnected, isConnected } = useContext(WSContext)

    useEffect(() => {
        if (isConnecting) {
            console.log('Already connecting. Exiting init hook.')
            return
        }

        isConnecting = true

        connectToWebSocket(window.location.hostname, window.location.port, {
            onClose: () => setIsConnected(false),
            onError: () => setIsConnected(false),
            onOpen: (ws: WebSocket) => {
                console.log('Connection is set.')
                wsRef.current = ws
                setIsConnected(true)
            }
        }).then(() => {
            isConnecting = false
        })
    }, [])

    useEffect(() => {
        if (isConnected === false) {
            if (isConnecting) {
                console.log('Already connecting. Exiting retry hook.')
                return
            }

            const retry = async () => {
                wsRef.current = null

                isConnecting = true

                console.log('trying to establish connection')

                await connectToWebSocket(window.location.hostname, window.location.port, {
                    onOpen: (ws: WebSocket) => {
                        console.log('Connection is set.')
                        wsRef.current = ws
                        setIsConnected(true)
                    },
                    onError: async () => {
                        setIsConnected(false)
                        console.log('connection error')

                        await sleep(1000)

                        console.log('trying to reconnect...')

                        await retry()
                    },
                    onClose: async () => {
                        setIsConnected(false)
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
    }, [isConnected])

    return (
        <>
            <LoadingOverlay isLoading={!isConnected}>
                <Router />
            </LoadingOverlay>
        </>
    )
}

export default Home
