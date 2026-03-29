import React, { useState, createContext, useContext, useRef, MutableRefObject, useEffect } from 'react'
import type { LobbyRoomClientMessage, LobbyRoomServerMessage, RealtimeLobbySnapshot, SocketMessage, StateEventName, WSRequestContext } from 'shared/contracts'
import type { TopicEventHandler, RequestData, RequestHandler } from 'uWebSockets/uws.types'
import { getCookie } from 'cookies-next'
import { getCloudflareRealtimeApiUrl, isCloudflareRealtimeEnabled } from 'client/network-utils/realtimeMode'
import {
    deriveLegacyEventsFromSnapshot,
    getWorkerErrorMessage,
    toLegacyGameActionEvent,
    toLegacyLobbyBaseInfo,
    toLegacyLobbyChatMessages,
    toLegacyLobbyData
} from 'client/network-utils/workerCompat'

type HandlerOn = <C extends StateEventName | WSRequestContext>(context: C, handler: Function) => void
type HandlerSend = <H extends WSRequestContext>(context: H, data?: RequestData<H>) => void
type RequestHandlerRegistrar = <C extends WSRequestContext>(context: C, handler: RequestHandler<C>) => void
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
    const workerRoomSnapshotRef = useRef<RealtimeLobbySnapshot | null>(null)
    const workerRoomIdRef = useRef('')

    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const isWorkerMode = isCloudflareRealtimeEnabled()

    const emit = (context: string, data: unknown) => {
        if (!(context in listeners.current)) {
            return
        }

        listeners.current[context].forEach(listener => listener(data))
    }

    const on: HandlerOn = (context: string, handler: Function) => {
        listeners.current[context] = listeners.current[context] || new Set()

        listeners.current[context].add(handler)
    }

    const unsubscribe: HandlerOn = (context: string, handler: Function) => {
        if (listeners.current[context]) {
            listeners.current[context].delete(handler)
        }
    }

    const createWorkerAuthHeaders = (contentType: 'json' | null = 'json') => {
        const headers = new Headers()
        const token = getCookie('token')

        if (contentType === 'json') {
            headers.set('content-type', 'application/json')
        }

        if (typeof token === 'string' && token.length) {
            headers.set('authorization', `Bearer ${token}`)
        }

        return headers
    }

    const readWorkerRoomSnapshot = async (lobbyId: string, shouldCache: boolean = false) => {
        const response = await fetch(getCloudflareRealtimeApiUrl(`/rooms/${encodeURIComponent(lobbyId)}/state`), {
            method: 'GET',
            headers: createWorkerAuthHeaders(null)
        })

        if (!response.ok) {
            throw new Error(await getWorkerErrorMessage(response, `Cannot find lobby with ID: ${lobbyId}`))
        }

        const body = await response.json()
        const snapshot = body.room as RealtimeLobbySnapshot

        if (shouldCache) {
            workerRoomSnapshotRef.current = snapshot
            workerRoomIdRef.current = snapshot.roomId
        }

        return snapshot
    }

    const applyWorkerSnapshot = (snapshot: RealtimeLobbySnapshot) => {
        const previousSnapshot = workerRoomSnapshotRef.current?.roomId === snapshot.roomId ? workerRoomSnapshotRef.current : null

        workerRoomSnapshotRef.current = snapshot
        workerRoomIdRef.current = snapshot.roomId

        if (!previousSnapshot) {
            return
        }

        deriveLegacyEventsFromSnapshot(previousSnapshot, snapshot).forEach(event => emit(event.ctx, event.data))
    }

    const sendWorkerRoomMessage = (message: LobbyRoomClientMessage) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.error('Cannot send worker room message because room websocket is not connected', message)
            return
        }

        wsRef.current.send(JSON.stringify(message))
    }

    const handleWorkerSend = async <H extends WSRequestContext>(context: H, data?: RequestData<H>) => {
        try {
            switch (context) {
                case 'Auth-Register': {
                    const response = await fetch(getCloudflareRealtimeApiUrl('/auth/register'), {
                        method: 'POST',
                        headers: createWorkerAuthHeaders(),
                        body: JSON.stringify({
                            userNickname: (data as RequestData<'Auth-Register'>).userNickname
                        })
                    })

                    if (!response.ok) {
                        emit('Auth-Register', {
                            success: false,
                            message: await getWorkerErrorMessage(response, 'Registration failed')
                        })
                        return
                    }

                    const body = await response.json()

                    emit('Auth-Register', {
                        success: true,
                        token: body.sessionToken,
                        user: body.session.user
                    })
                    return
                }
                case 'Auth-Logout': {
                    await fetch(getCloudflareRealtimeApiUrl('/auth/logout'), {
                        method: 'POST',
                        headers: createWorkerAuthHeaders(null)
                    }).catch(error => {
                        console.error('Cloudflare logout failed', error)
                    })
                    return
                }
                case 'Lobby-GetList': {
                    const response = await fetch(getCloudflareRealtimeApiUrl('/lobbies'), {
                        method: 'GET',
                        headers: createWorkerAuthHeaders(null)
                    })

                    if (!response.ok) {
                        console.error(await getWorkerErrorMessage(response, 'Failed to load lobbies'))
                        emit('Lobby-GetList', {
                            lobbies: []
                        })
                        return
                    }

                    const body = await response.json()

                    emit('Lobby-GetList', {
                        lobbies: (body.lobbies || []).map(toLegacyLobbyBaseInfo)
                    })
                    return
                }
                case 'Lobby-GetPublicInfo': {
                    const lobbyId = (data as RequestData<'Lobby-GetPublicInfo'>).id
                    const snapshot = await readWorkerRoomSnapshot(lobbyId)

                    emit('Lobby-GetPublicInfo', {
                        success: true,
                        lobbyData: toLegacyLobbyData(snapshot)
                    })
                    return
                }
                case 'Chat-Get': {
                    const payload = data as RequestData<'Chat-Get'>

                    if (payload.scope === 'global') {
                        emit('Chat-Get', {
                            success: false,
                            message: 'Global chat is not supported in Cloudflare worker mode yet'
                        })
                        return
                    }

                    const shouldCache = workerRoomIdRef.current === payload.lobbyId || !workerRoomIdRef.current
                    const snapshot =
                        workerRoomSnapshotRef.current?.roomId === payload.lobbyId
                            ? workerRoomSnapshotRef.current
                            : await readWorkerRoomSnapshot(payload.lobbyId, shouldCache)

                    emit('Chat-Get', {
                        success: true,
                        lobbyId: payload.lobbyId,
                        messages: toLegacyLobbyChatMessages(snapshot),
                        scope: 'lobby'
                    })
                    return
                }
                case 'Chat-Send': {
                    const payload = data as RequestData<'Chat-Send'>

                    if (payload.scope !== 'lobby') {
                        console.warn('Global chat is not supported in Cloudflare worker mode yet')
                        return
                    }

                    sendWorkerRoomMessage({
                        type: 'chat.send',
                        payload: {
                            text: payload.message.text
                        }
                    })
                    return
                }
                case 'Lobby-StartReadyCheck': {
                    sendWorkerRoomMessage({
                        type: 'ready.start'
                    })
                    return
                }
                case 'ReadyCheck-Response': {
                    const payload = data as RequestData<'ReadyCheck-Response'>

                    sendWorkerRoomMessage({
                        type: 'ready.set',
                        payload: {
                            ready: payload.ready
                        }
                    })
                    return
                }
                case 'Game-Start': {
                    sendWorkerRoomMessage({
                        type: 'game.start'
                    })
                    return
                }
                case 'Game-SendAction': {
                    const payload = data as RequestData<'Game-SendAction'>

                    if (payload.actionName === '$Move') {
                        sendWorkerRoomMessage({
                            type: 'tictactoe.move',
                            payload: {
                                cell: (payload.actionPayload as { cell: [number, number] }).cell
                            }
                        })
                        return
                    }

                    if (payload.actionName === '$Click') {
                        sendWorkerRoomMessage({
                            type: 'clicker.click',
                            payload: {
                                x: (payload.actionPayload as { x: number; y: number }).x,
                                y: (payload.actionPayload as { x: number; y: number }).y
                            }
                        })
                        return
                    }

                    console.warn(`Action ${payload.actionName} is not supported in Cloudflare worker mode yet`)
                    return
                }
                case 'Universal-Subscription': {
                    return
                }
                default: {
                    console.warn(`WS context ${context} is not supported in Cloudflare worker mode yet`, data)
                    return
                }
            }
        } catch (error) {
            console.error(`Worker compatibility request failed for ${context}`, error)

            if (context === 'Lobby-GetPublicInfo') {
                emit('Lobby-GetPublicInfo', {
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to load lobby'
                })
            }

            if (context === 'Chat-Get') {
                emit('Chat-Get', {
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to load chat'
                })
            }
        }
    }

    const send: HandlerSend = (context, data) => {
        if (isWorkerMode) {
            void handleWorkerSend(context, data)
            return
        }

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

        if (isWorkerMode) {
            const workerMessage = message as LobbyRoomServerMessage

            if (workerMessage.type === 'pong') {
                return
            }

            if (workerMessage.type === 'room.error') {
                console.error('Worker room error', workerMessage.payload)
                return
            }

            if (workerMessage.type === 'room.notice') {
                if (workerMessage.payload.message.includes('destroyed') && workerRoomIdRef.current) {
                    emit('Lobby-Destroy', {
                        lobbyId: workerRoomIdRef.current
                    })
                }

                return
            }

            if (workerMessage.type === 'room.snapshot') {
                applyWorkerSnapshot(workerMessage.payload)
                return
            }

            if (workerMessage.type === 'game.action') {
                if (!workerRoomIdRef.current) {
                    return
                }

                emit('Game-SessionAction', toLegacyGameActionEvent(workerRoomIdRef.current, workerMessage.payload))
            }

            return
        }

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
