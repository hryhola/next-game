import React, { useState, createContext, useContext, useEffect, useRef, MutableRefObject } from 'react'
import type { HandlerName } from 'uWebSockets/ws'
import type { AbstractSocketMessage, RequestData } from 'uWebSockets/uws.types'
import type { GlobalEventName } from 'uWebSockets/globalSocketEvents'
import { UserContext } from './user'

type HandlerOn = <C extends GlobalEventName | HandlerName>(context: C, handler: Function) => void
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
    const auth = useContext(UserContext)

    const wsRef = useRef<WebSocket | null>(null)

    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [listeners, setListeners] = useState<Record<string, Array<Function>>>({})

    const on: HandlerOn = (context: string, handler: Function) => {
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
            console.error('Cannot send because ws is not defined', context, data)
            return
        }

        const message: AbstractSocketMessage = {
            ctx: context,
            data: data || null
        }

        console.log('%c' + context + ' %csend', 'color: Chartreuse', '', message.data)

        const token = localStorage.getItem('token')

        if (token) {
            message.token = token
        }

        wsRef.current.send(JSON.stringify(message))
    }

    const messageHandler = (event: MessageEvent<any>) => {
        if (event.data === 'pong') {
            return
        }

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
                        token: localStorage.getItem('token'),
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
