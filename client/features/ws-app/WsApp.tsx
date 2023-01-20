import { useContext, useEffect, useRef } from 'react'
import { GetServerSideProps, NextPage } from 'next'
import { Router } from 'client/features/app/Router'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { connectToWebSocket } from 'client/network-utils/socket'
import { WSContext } from 'client/context/list/ws'
import { sleep } from 'util/time'
import Head from 'next/head'
import { DevToolsOverlay } from 'client/features/dev/DevToolsOverlay'
import { RequestHandler } from 'uWebSockets/uws.types'
import { UserContext } from 'client/context/list/user'
import { RouterContext } from 'client/context/list/router'
import { AppContext } from 'client/context/AppContext'
import { deleteCookie, getCookie } from 'cookies-next'

let isConnecting = false

type Props = {
    children: JSX.Element | JSX.Element[]
}

export const WsApp: React.FC<Props> = props => {
    const wasLoginCalled = useRef(false)
    const ws = useContext(WSContext)
    const user = useContext(UserContext)
    const router = useContext(RouterContext)

    useEffect(() => {
        console.log('wsapp loaded')

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

    return <>{props.children}</>
}
