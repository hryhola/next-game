import React, { useState, createContext, useContext, useEffect, useRef, MutableRefObject } from 'react'
import type { HandlerName } from 'uws/api'
import type { RequestData, RequestHandler } from 'uws/uws.types'
import { AuthContext } from './auth.context'

type HandlerOn = <C extends keyof typeof import('uws/events')['topics']>(context: C, handler: RequestHandler<C>) => void
type HandlerSend = <H extends HandlerName>(context: H, data?: RequestData<H>) => void

export interface WSData {
    wsRef: MutableRefObject<WebSocket | null>
    isConnected: boolean | null
    setIsConnected: (value: boolean) => void
    on: HandlerOn
    send: HandlerSend
}

// @ts-ignore
export const WSContext = createContext<WSData>({})

interface Props {
    children?: JSX.Element
}

export const WSProvider: React.FC<Props> = props => {
    const auth = useContext(AuthContext)

    const wsRef = useRef<WebSocket | null>(null)

    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [listeners, setListeners] = useState<Record<string, Array<Function>>>({})

    const on: HandlerOn = (context, handler) => {
        setListeners(curr => {
            if (curr[context] && curr[context].includes(handler)) {
                return curr
            }

            return {
                ...curr,
                [context]: [...(context in curr ? curr[context] : []), handler]
            }
        })
    }

    const send: HandlerSend = (context, data) => {
        if (!wsRef.current) {
            console.error('Cannot send', context, data)
            return
        }

        const message = {
            ctx: context,
            data: data || null
        }

        console.log('send', message)

        wsRef.current.send(JSON.stringify(message))
    }

    const messageHandler = (event: MessageEvent<any>) => {
        console.log('message handler')

        const message = JSON.parse(event.data)

        if (message.ctx in listeners) {
            listeners[message.ctx].forEach(listener => listener(message.data))
        }
    }

    if (wsRef.current) wsRef.current.onmessage = messageHandler

    useEffect(() => {
        if (auth.username) {
            window.addEventListener('beforeunload', () => {
                wsRef.current?.send(
                    JSON.stringify({
                        ctx: 'Auth-Logout',
                        data: {
                            username: auth.username
                        }
                    })
                )
            })
        }
    }, [wsRef.current, auth.username])

    return <WSContext.Provider value={{ wsRef, isConnected, setIsConnected, on, send }}>{props.children}</WSContext.Provider>
}
