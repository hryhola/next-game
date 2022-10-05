import { useContext, useEffect } from 'react'
import { NextPage } from 'next'
import { Router } from '../client/features/app/Router'
import { LoadingOverlay } from '../client/ui/loadingOverlay/LoadingOverlay'
import { connectToWebSocket, terminateWS } from '../client/ws'
import { WSContext } from '../client/context/ws.context'
import { sleep } from '../util/time'

const Home: NextPage = () => {
    const { setWS, setIsConnected, isConnected } = useContext(WSContext)

    const handleWSConnection = {
        onClose: () => setIsConnected(false),
        onError: () => setIsConnected(false),
        onOpen: (ws: WebSocket) => {
            setWS(ws)
            setIsConnected(true)
        }
    }

    useEffect(() => {
        connectToWebSocket(handleWSConnection)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        console.log('isConnected', isConnected)

        if (isConnected === false) {
            const retry = () => {
                terminateWS()

                console.log('trying to establish connection')

                connectToWebSocket({
                    ...handleWSConnection,
                    onError: async () => {
                        setIsConnected(false)
                        console.log('connection error')

                        await sleep(1000)

                        console.log('trying to reconnect...')

                        retry()
                    },
                    onClose: async () => {
                        setIsConnected(false)
                        console.log('connection closet')

                        await sleep(1000)

                        console.log('trying to reconnect...')

                        retry()
                    }
                })
            }

            retry()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected])

    return (
        <LoadingOverlay isLoading={!isConnected}>
            <Router />
        </LoadingOverlay>
    )
}

export default Home
