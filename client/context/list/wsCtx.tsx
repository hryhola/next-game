import React, { useState, createContext, useContext, useRef, MutableRefObject, useEffect } from 'react'
import type {
    GlobalRealtimeServerMessage,
    LobbyClientMessage,
    LobbyServerMessage,
    PresenceSnapshot,
    RequestData,
    RequestHandler,
    RealtimeChatMessage,
    RealtimeLobbyListItem,
    RealtimeLobbySnapshot,
    StateEventName,
    TopicEventHandler,
    WSRequestContext
} from 'shared/contracts'
import { getCookie } from 'cookies-next'
import { getCloudflareGlobalWebSocketUrl, getCloudflareRealtimeApiUrl } from 'client/network-utils/realtimeMode'
import {
    deriveAppEventsFromSnapshot,
    toAppChatMessages,
    getWorkerErrorMessage,
    toAppGameActionEvent,
    toAppLobbyBaseInfo,
    toAppLobbyChatMessages,
    toAppLobbyData,
    toAppLobbyMember
} from 'client/network-utils/realtimeAdapter'
import { useUser } from './userCtx'

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
    children?: React.ReactNode
}

export const WSProvider: React.FC<Props> = props => {
    const user = useUser()
    const wsRef = useRef<WebSocket | null>(null)
    const workerGlobalSocketRef = useRef<WebSocket | null>(null)
    const workerGlobalPingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const workerGlobalReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const workerGlobalShouldReconnectRef = useRef(false)
    const listeners = useRef({} as Record<string, Set<Function>>)
    const workerGlobalPresenceRef = useRef<PresenceSnapshot | null>(null)
    const workerGlobalChatMessagesRef = useRef<RealtimeChatMessage[] | null>(null)
    const workerLobbyListRef = useRef<RealtimeLobbyListItem[] | null>(null)
    const workerLobbySnapshotRef = useRef<RealtimeLobbySnapshot | null>(null)
    const workerLobbyIdRef = useRef('')

    const [isConnected, setIsConnected] = useState<boolean | null>(null)

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

    const emitPresenceSnapshot = (snapshot: PresenceSnapshot) => {
        workerGlobalPresenceRef.current = snapshot

        emit('UserRegistry-OnlineUpdate', {
            scope: 'global',
            list: snapshot.onlineUsers.map(onlineUser => ({
                id: onlineUser.id,
                userNickname: onlineUser.userNickname
            }))
        })
    }

    const emitLobbyList = (lobbies: RealtimeLobbyListItem[]) => {
        workerLobbyListRef.current = lobbies

        emit('Lobby-ListUpdated', {
            lobbies: lobbies.map(toAppLobbyBaseInfo)
        })
    }

    const readWorkerPresenceSnapshot = async (preferCached: boolean = true) => {
        if (preferCached && workerGlobalPresenceRef.current) {
            return workerGlobalPresenceRef.current
        }

        const response = await fetch(getCloudflareRealtimeApiUrl('/presence/state'), {
            method: 'GET',
            headers: createWorkerAuthHeaders(null)
        })

        if (!response.ok) {
            throw new Error(await getWorkerErrorMessage(response, 'Failed to load online users'))
        }

        const body = await response.json()
        const snapshot = body.presence as PresenceSnapshot

        workerGlobalPresenceRef.current = snapshot

        return snapshot
    }

    const readWorkerGlobalChatMessages = async (preferCached: boolean = true) => {
        if (preferCached && workerGlobalChatMessagesRef.current) {
            return workerGlobalChatMessagesRef.current
        }

        const response = await fetch(getCloudflareRealtimeApiUrl('/chat/global'), {
            method: 'GET',
            headers: createWorkerAuthHeaders(null)
        })

        if (!response.ok) {
            throw new Error(await getWorkerErrorMessage(response, 'Failed to load global chat'))
        }

        const body = await response.json()
        const messages = (body.messages || []) as RealtimeChatMessage[]

        workerGlobalChatMessagesRef.current = messages

        return messages
    }

    const readWorkerLobbyList = async (preferCached: boolean = true) => {
        if (preferCached && workerLobbyListRef.current) {
            return workerLobbyListRef.current
        }

        const response = await fetch(getCloudflareRealtimeApiUrl('/lobbies'), {
            method: 'GET',
            headers: createWorkerAuthHeaders(null)
        })

        if (!response.ok) {
            throw new Error(await getWorkerErrorMessage(response, 'Failed to load lobbies'))
        }

        const body = await response.json()
        const lobbies = (body.lobbies || []) as RealtimeLobbyListItem[]

        workerLobbyListRef.current = lobbies

        return lobbies
    }

    const readWorkerLobbySnapshot = async (lobbyId: string, shouldCache: boolean = false) => {
        const response = await fetch(getCloudflareRealtimeApiUrl(`/lobbies/${encodeURIComponent(lobbyId)}/state`), {
            method: 'GET',
            headers: createWorkerAuthHeaders(null)
        })

        if (!response.ok) {
            throw new Error(await getWorkerErrorMessage(response, `Cannot find lobby with ID: ${lobbyId}`))
        }

        const body = await response.json()
        const snapshot = body.lobby as RealtimeLobbySnapshot

        if (shouldCache) {
            workerLobbySnapshotRef.current = snapshot
            workerLobbyIdRef.current = snapshot.lobbyId
        }

        return snapshot
    }

    const applyWorkerSnapshot = (snapshot: RealtimeLobbySnapshot) => {
        const previousSnapshot = workerLobbySnapshotRef.current?.lobbyId === snapshot.lobbyId ? workerLobbySnapshotRef.current : null

        workerLobbySnapshotRef.current = snapshot
        workerLobbyIdRef.current = snapshot.lobbyId

        if (!previousSnapshot) {
            return
        }

        deriveAppEventsFromSnapshot(previousSnapshot, snapshot).forEach(event => emit(event.ctx, event.data))
    }

    const sendWorkerLobbyMessage = (message: LobbyClientMessage) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send worker lobby message because the lobby websocket is not connected yet', message)
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
                    const lobbies = await readWorkerLobbyList()

                    emit('Lobby-GetList', {
                        lobbies: lobbies.map(toAppLobbyBaseInfo)
                    })
                    return
                }
                case 'Lobby-GetPublicInfo': {
                    const lobbyId = (data as RequestData<'Lobby-GetPublicInfo'>).id
                    const snapshot = await readWorkerLobbySnapshot(lobbyId)

                    emit('Lobby-GetPublicInfo', {
                        success: true,
                        lobbyData: toAppLobbyData(snapshot)
                    })
                    return
                }
                case 'Chat-Get': {
                    const payload = data as RequestData<'Chat-Get'>

                    if (payload.scope === 'global') {
                        const messages = await readWorkerGlobalChatMessages()

                        emit('Chat-Get', {
                            success: true,
                            messages: toAppChatMessages(messages),
                            scope: 'global'
                        })
                        return
                    }

                    const shouldCache = workerLobbyIdRef.current === payload.lobbyId || !workerLobbyIdRef.current
                    const snapshot =
                        workerLobbySnapshotRef.current?.lobbyId === payload.lobbyId
                            ? workerLobbySnapshotRef.current
                            : await readWorkerLobbySnapshot(payload.lobbyId, shouldCache)

                    emit('Chat-Get', {
                        success: true,
                        lobbyId: payload.lobbyId,
                        messages: toAppLobbyChatMessages(snapshot),
                        scope: 'lobby'
                    })
                    return
                }
                case 'Chat-Send': {
                    const payload = data as RequestData<'Chat-Send'>

                    if (payload.scope === 'global') {
                        const response = await fetch(getCloudflareRealtimeApiUrl('/chat/global'), {
                            method: 'POST',
                            headers: createWorkerAuthHeaders(),
                            body: JSON.stringify({
                                text: payload.message.text
                            })
                        })

                        if (!response.ok) {
                            console.error(await getWorkerErrorMessage(response, 'Failed to send global chat message'))
                        }
                        return
                    }

                    sendWorkerLobbyMessage({
                        type: 'lobby.command',
                        payload: {
                            commandName: 'chat.send',
                            commandPayload: {
                                text: payload.message.text
                            }
                        }
                    })
                    return
                }
                case 'Lobby-Tip': {
                    const payload = data as RequestData<'Lobby-Tip'>

                    sendWorkerLobbyMessage({
                        type: 'lobby.command',
                        payload: {
                            commandName: 'tip',
                            commandPayload: {
                                id: payload.id,
                                toUserId: payload.to ? workerLobbySnapshotRef.current?.members.find(member => member.userNickname === payload.to)?.id || '' : ''
                            }
                        }
                    })
                    return
                }
                case 'Lobby-Kick': {
                    const payload = data as RequestData<'Lobby-Kick'>

                    sendWorkerLobbyMessage({
                        type: 'lobby.command',
                        payload: {
                            commandName: 'kick',
                            commandPayload: {
                                userId: payload.userId
                            }
                        }
                    })
                    return
                }
                case 'Lobby-StartReadyCheck': {
                    sendWorkerLobbyMessage({
                        type: 'lobby.command',
                        payload: {
                            commandName: 'ready.start'
                        }
                    })
                    return
                }
                case 'ReadyCheck-Response': {
                    const payload = data as RequestData<'ReadyCheck-Response'>

                    sendWorkerLobbyMessage({
                        type: 'lobby.command',
                        payload: {
                            commandName: 'ready.set',
                            commandPayload: {
                                ready: payload.ready
                            }
                        }
                    })
                    return
                }
                case 'Game-Start': {
                    sendWorkerLobbyMessage({
                        type: 'lobby.command',
                        payload: {
                            commandName: 'game.start'
                        }
                    })
                    return
                }
                case 'Game-SendAction': {
                    const payload = data as RequestData<'Game-SendAction'>

                    sendWorkerLobbyMessage({
                        type: 'game.command',
                        payload: {
                            commandName: payload.actionName,
                            commandPayload: payload.actionPayload
                        }
                    })
                    return
                }
                case 'Universal-Subscription': {
                    return
                }
                case 'Users-Get': {
                    const snapshot = await readWorkerPresenceSnapshot()

                    emit('Users-Get', {
                        success: true,
                        count: snapshot.onlineUsers.length,
                        data: snapshot.onlineUsers.map(onlineUser => ({
                            id: onlineUser.id,
                            userAvatarUrl: onlineUser.userAvatarUrl,
                            userColor: onlineUser.userColor,
                            userIsOnline: true,
                            userNickname: onlineUser.userNickname
                        })),
                        scope: 'global'
                    })
                    return
                }
                case 'Users-GetCount': {
                    const snapshot = await readWorkerPresenceSnapshot()

                    emit('Users-GetCount', {
                        success: true,
                        count: snapshot.onlineUsers.length,
                        scope: 'global'
                    })
                    return
                }
                default: {
                    console.warn(`WS context ${context} is not supported by the realtime API yet`, data)
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

            if (context === 'Lobby-GetList') {
                emit('Lobby-GetList', {
                    lobbies: []
                })
            }

            if (context === 'Users-Get') {
                emit('Users-Get', {
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to load users'
                })
            }

            if (context === 'Users-GetCount') {
                emit('Users-GetCount', {
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to load users count'
                })
            }
        }
    }

    const handleWorkerGlobalMessage = (event: MessageEvent<any>) => {
        if (event.data === 'pong') {
            return
        }

        const workerMessage = JSON.parse(event.data) as GlobalRealtimeServerMessage

        if (workerMessage.type === 'pong') {
            return
        }

        if (workerMessage.type === 'presence.snapshot') {
            emitPresenceSnapshot(workerMessage.payload)
            return
        }

        if (workerMessage.type === 'global.chat.snapshot') {
            workerGlobalChatMessagesRef.current = workerMessage.payload.messages

            emit('Chat-Get', {
                success: true,
                messages: toAppChatMessages(workerMessage.payload.messages),
                scope: 'global'
            })
            return
        }

        if (workerMessage.type === 'global.chat.message') {
            workerGlobalChatMessagesRef.current = [
                workerMessage.payload,
                ...(workerGlobalChatMessagesRef.current || []).filter(message => message.id !== workerMessage.payload.id)
            ].slice(0, 100)

            emit('Chat-NewMessage', {
                message: toAppChatMessages([workerMessage.payload])[0],
                scope: 'global'
            })
            return
        }

        if (workerMessage.type === 'global.lobbies.updated') {
            emitLobbyList(workerMessage.payload.lobbies)
        }
    }

    const handleWorkerLobbyMessage = (workerMessage: LobbyServerMessage) => {
        if (workerMessage.type === 'pong') {
            return
        }

        if (workerMessage.type === 'lobby.error') {
            console.error('Worker lobby error', workerMessage.payload)
            return
        }

        if (workerMessage.type === 'lobby.notice') {
            if (workerMessage.payload.message.includes('destroyed') && workerLobbyIdRef.current) {
                emit('Lobby-Destroy', {
                    lobbyId: workerLobbyIdRef.current
                })
            }

            return
        }

        if (workerMessage.type === 'lobby.event') {
            if (workerMessage.payload.eventName === 'tip') {
                emit('Lobby-Tipped', workerMessage.payload.eventPayload)
                return
            }

            const kickPayload = workerMessage.payload.eventPayload as { memberId: string }
            const snapshot = workerLobbySnapshotRef.current
            const memberIndex = snapshot?.members.findIndex(member => member.id === kickPayload.memberId) ?? -1

            if (!snapshot || memberIndex < 0) {
                return
            }

            emit('Lobby-Kicked', {
                lobbyId: snapshot.lobbyId,
                member: toAppLobbyMember(snapshot.members[memberIndex], memberIndex)
            })
            return
        }

        if (workerMessage.type === 'lobby.state') {
            applyWorkerSnapshot(workerMessage.payload)
            return
        }

        if (workerMessage.type === 'game.event') {
            if (!workerLobbyIdRef.current) {
                return
            }

            emit('Game-SessionAction', toAppGameActionEvent(workerLobbyIdRef.current, workerMessage.payload))
            return
        }
    }

    const send: HandlerSend = (context, data) => {
        void handleWorkerSend(context, data)
    }

    const messageHandler = (event: MessageEvent<any>) => {
        if (event.data === 'pong') {
            return
        }

        handleWorkerLobbyMessage(JSON.parse(event.data) as LobbyServerMessage)
    }

    if (wsRef.current) wsRef.current.onmessage = messageHandler

    useEffect(() => {
        if (!user.id) {
            workerGlobalShouldReconnectRef.current = false

            if (workerGlobalReconnectRef.current) {
                clearTimeout(workerGlobalReconnectRef.current)
                workerGlobalReconnectRef.current = null
            }

            if (workerGlobalPingRef.current) {
                clearInterval(workerGlobalPingRef.current)
                workerGlobalPingRef.current = null
            }

            if (workerGlobalSocketRef.current) {
                try {
                    workerGlobalSocketRef.current.close()
                } catch (_error) {
                    return
                } finally {
                    workerGlobalSocketRef.current = null
                }
            }

            workerGlobalPresenceRef.current = null
            workerGlobalChatMessagesRef.current = null
            workerLobbyListRef.current = null
            return
        }

        const token = getCookie('token')

        if (typeof token !== 'string' || !token.length) {
            workerGlobalShouldReconnectRef.current = false
            return
        }

        workerGlobalShouldReconnectRef.current = true

        const connectWorkerGlobalSocket = () => {
            if (
                workerGlobalSocketRef.current &&
                (workerGlobalSocketRef.current.readyState === WebSocket.CONNECTING || workerGlobalSocketRef.current.readyState === WebSocket.OPEN)
            ) {
                return
            }

            const socket = new WebSocket(getCloudflareGlobalWebSocketUrl(token))

            workerGlobalSocketRef.current = socket

            socket.onopen = () => {
                if (workerGlobalPingRef.current) {
                    clearInterval(workerGlobalPingRef.current)
                }

                workerGlobalPingRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'ping' }))
                    }
                }, 2000)
            }

            socket.onmessage = handleWorkerGlobalMessage

            socket.onclose = () => {
                if (workerGlobalSocketRef.current === socket) {
                    workerGlobalSocketRef.current = null
                }

                if (workerGlobalPingRef.current) {
                    clearInterval(workerGlobalPingRef.current)
                    workerGlobalPingRef.current = null
                }

                if (workerGlobalReconnectRef.current) {
                    clearTimeout(workerGlobalReconnectRef.current)
                }

                workerGlobalReconnectRef.current = setTimeout(() => {
                    const nextToken = getCookie('token')

                    if (workerGlobalShouldReconnectRef.current && user.id && typeof nextToken === 'string' && nextToken.length) {
                        connectWorkerGlobalSocket()
                    }
                }, 1500)
            }

            socket.onerror = error => {
                console.error('Worker global socket error', error)
            }
        }

        connectWorkerGlobalSocket()

        return () => {
            workerGlobalShouldReconnectRef.current = false

            if (workerGlobalReconnectRef.current) {
                clearTimeout(workerGlobalReconnectRef.current)
                workerGlobalReconnectRef.current = null
            }

            if (workerGlobalPingRef.current) {
                clearInterval(workerGlobalPingRef.current)
                workerGlobalPingRef.current = null
            }

            if (workerGlobalSocketRef.current) {
                try {
                    workerGlobalSocketRef.current.close()
                } catch (_error) {
                    return
                } finally {
                    workerGlobalSocketRef.current = null
                }
            }
        }
    }, [user.id])

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
