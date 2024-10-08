import React, { useState, createContext, useContext, useRef, MutableRefObject, useEffect } from 'react'
import type { HandlerName } from 'uWebSockets/ws'
import type { SocketMessage, TopicEventHandler, RequestData, RequestHandler } from 'uWebSockets/uws.types'
import type { StateEventName } from 'uWebSockets/topicEvents'
import { getCookie } from 'cookies-next'

type HandlerOn = <C extends StateEventName | HandlerName>(context: C, handler: Function) => void
type HandlerSend = <H extends HandlerName>(context: H, data?: RequestData<H>) => void
type RequestHandlerRegistrar = <C extends HandlerName>(context: C, handler: RequestHandler<C>) => void
type EventHandlerRegistrar = <C extends StateEventName>(context: C, handler: TopicEventHandler<C>) => void

export interface WSData {
    wsRef: MutableRefObject<WebSocket | null>
    isConnected: boolean | null
    setIsConnected: (value: boolean) => void
    on: HandlerOn
    send: HandlerSend
    unsubscribe: HandlerOn
}

// @ts-ignore
export const WSContext = createContext<WSData>({})

interface Props {
    children?: JSX.Element
}

export const WSProvider: React.FC<Props> = props => {
    const wsRef = useRef<WebSocket | null>(null)
    const listeners = useRef({} as Record<string, Set<Function>>)

    const [isConnected, setIsConnected] = useState<boolean | null>(null)

    const on: HandlerOn = (context: string, handler: Function) => {
        listeners.current[context] = listeners.current[context] || new Set()

        listeners.current[context].add(handler)
    }

    const unsubscribe: HandlerOn = (context: string, handler: Function) => {
        if (listeners.current[context]) {
            listeners.current[context].delete(handler)
        }
    }

    const send: HandlerSend = (context, data) => {
        if (!wsRef.current) {
            console.error('Cannot send because ws is not defined', context, data)
            return
        }

        const message: SocketMessage = {
            ctx: context,
            data: data || null
        }

        console.log('%c' + context + ' %csend', 'color: Chartreuse', '', message.data)

        const token = getCookie('token') as string | undefined

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

        if (message.ctx in listeners.current) {
            listeners.current[message.ctx].forEach(listener => listener(message.data))
        }
    }

    if (wsRef.current) wsRef.current.onmessage = messageHandler

    return <WSContext.Provider value={{ wsRef, isConnected, setIsConnected, on, send, unsubscribe }}>{props.children}</WSContext.Provider>
}

export const useWS = () => {
    return useContext(WSContext)
}

export const useRequestHandler: RequestHandlerRegistrar = (context, handler) => {
    const { on, unsubscribe } = useWS()

    useEffect(() => {
        on(context, handler)

        return () => {
            unsubscribe(context, handler)
        }
    }, [])
}

export const useEventHandler: EventHandlerRegistrar = (context, handler) => {
    const { on, unsubscribe } = useWS()

    useEffect(() => {
        on(context, handler)

        return () => {
            unsubscribe(context, handler)
        }
    }, [])
}
