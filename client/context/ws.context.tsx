import React, { useState, createContext, useContext, useEffect } from 'react'
import { AuthContext } from './auth.context'

export interface WSData {
    ws: WebSocket | null
    isConnected: boolean | null
    setWS: (ws: WebSocket) => void
    setIsConnected: (value: boolean) => void
    on: <T>(context: string, handler: (data: T) => void) => void
    send: <T>(context: string, data?: T) => void
}

const init: WSData = {
    ws: null,
    isConnected: null,
    setWS: _ => {
        throw new Error('Too soon')
    },
    setIsConnected: _ => {
        throw new Error('Too soon')
    },
    on: _ => {
        throw new Error('Too soon')
    },
    send: _ => {
        throw new Error('Too soon')
    }
}

export const WSContext = createContext<WSData>(init)

interface Props {
    children?: JSX.Element
}

export const WSProvider: React.FC<Props> = props => {
    const auth = useContext(AuthContext)

    const [ws, setWS] = useState<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [listeners, setListeners] = useState<Record<string, Array<Function>>>({})

    if (ws) {
        ws.onmessage = event => {
            const message = JSON.parse(event.data)

            if (message.ctx in listeners) {
                listeners[message.ctx].forEach(listener => listener(message.data))
            }
        }
    }

    function on<T>(context: string, handler: (data: T) => void) {
        setListeners({
            ...listeners,
            [context]: [...(context in listeners ? listeners[context] : []), handler]
        })
    }

    function send<T>(context: string, data?: T) {
        if (!ws) {
            console.error('Cannot send', context, data)
            return
        }

        const message = {
            ctx: context,
            data: data || null
        }

        console.log('send', message)

        ws.send(JSON.stringify(message))
    }

    useEffect(() => {
        if (auth.username) {
            window.addEventListener('beforeunload', () => {
                ws?.send(
                    JSON.stringify({
                        ctx: 'close',
                        data: {
                            username: auth.username
                        }
                    })
                )
            })
        }
    }, [ws, auth.username])

    return <WSContext.Provider value={{ ws, setWS, isConnected, setIsConnected, on, send }}>{props.children}</WSContext.Provider>
}
