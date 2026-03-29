import { DurableObject } from 'cloudflare:workers'
import type { IdentityProfile, PresenceSnapshot, PresenceUser } from '../../../shared/contracts/identity'
import type { RealtimeChatMessage, RealtimeLobbyListItem } from '../../../shared/contracts/realtime-lobby'
import { json } from '../lib/json'
import { listLobbies } from '../lobbies/store'
import type { RealtimeWorkerEnv } from '../types'

type PresenceAttachment = {
    connectedAt: string
    sessionId: string
    user: IdentityProfile
}

type PresenceHeaders = PresenceAttachment

type GlobalChatRequest = {
    text?: string
}

const GLOBAL_CHAT_STORAGE_KEY = 'global-chat'

function readPresenceHeaders(request: Request): PresenceHeaders | null {
    const sessionId = request.headers.get('x-session-id')
    const userId = request.headers.get('x-user-id')
    const userNickname = request.headers.get('x-user-nickname')
    const userColor = request.headers.get('x-user-color')
    const userAvatarUrl = request.headers.get('x-user-avatar-url')

    if (!sessionId || !userId || !userNickname || !userColor) {
        return null
    }

    const user: IdentityProfile = {
        id: userId,
        userNickname,
        userColor
    }

    if (userAvatarUrl) {
        user.userAvatarUrl = userAvatarUrl
    }

    return {
        connectedAt: new Date().toISOString(),
        sessionId,
        user
    }
}

export class GlobalPresenceDO extends DurableObject<RealtimeWorkerEnv> {
    constructor(ctx: DurableObjectState, env: RealtimeWorkerEnv) {
        super(ctx, env)

        this.ctx.setHibernatableWebSocketEventTimeout(60_000)
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/health') {
            const snapshot = this.buildSnapshot()

            return json({
                ok: true,
                onlineUsers: snapshot.onlineUsers.length,
                totalConnections: snapshot.totalConnections,
                updatedAt: snapshot.updatedAt
            })
        }

        if (url.pathname === '/state') {
            return json({
                ok: true,
                presence: this.buildSnapshot()
            })
        }

        if (url.pathname === '/chat') {
            return this.handleChatRequest(request)
        }

        if (url.pathname === '/events/lobbies-updated') {
            if (request.method !== 'POST') {
                return json(
                    {
                        ok: false,
                        message: 'Method not allowed'
                    },
                    { status: 405 }
                )
            }

            await this.broadcastLobbyList()

            return json({
                ok: true
            })
        }

        if (url.pathname === '/websocket') {
            return this.handleWebSocket(request)
        }

        return json(
            {
                ok: false,
                message: `Unknown GlobalPresenceDO route: ${url.pathname}`
            },
            { status: 404 }
        )
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const textMessage = typeof message === 'string' ? message : new TextDecoder().decode(message)

        if (textMessage === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
            return
        }

        try {
            const parsed = JSON.parse(textMessage) as { type?: string }

            if (parsed.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }))
                return
            }
        } catch (_error) {
            return
        }

        await this.sendInitialState(ws)
    }

    webSocketClose(): void {
        this.broadcastPresenceSnapshot()
    }

    webSocketError(): void {
        this.broadcastPresenceSnapshot()
    }

    private async handleChatRequest(request: Request): Promise<Response> {
        if (request.method === 'GET') {
            return json({
                ok: true,
                messages: this.getRecentChatMessages(await this.getChatMessages())
            })
        }

        if (request.method !== 'POST') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const presenceHeaders = readPresenceHeaders(request)

        if (!presenceHeaders) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated chat headers'
                },
                { status: 400 }
            )
        }

        const body = (await request.json().catch(() => null)) as GlobalChatRequest | null
        const text = body?.text?.trim()

        if (!text) {
            return json(
                {
                    ok: false,
                    message: 'Message cannot be empty'
                },
                { status: 400 }
            )
        }

        const nextMessage: RealtimeChatMessage = {
            createdAt: new Date().toISOString(),
            from: presenceHeaders.user.userNickname,
            fromColor: presenceHeaders.user.userColor,
            fromUserId: presenceHeaders.user.id,
            id: crypto.randomUUID(),
            text
        }

        const messages = await this.getChatMessages()
        messages.push(nextMessage)

        await this.ctx.storage.put(GLOBAL_CHAT_STORAGE_KEY, messages.slice(-100))
        this.broadcastGlobalChatMessage(nextMessage)

        return json({
            ok: true,
            message: nextMessage
        })
    }

    private async handleWebSocket(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected Upgrade: websocket', { status: 426 })
        }

        const presenceHeaders = readPresenceHeaders(request)

        if (!presenceHeaders) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated presence headers'
                },
                { status: 400 }
            )
        }

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

        server.serializeAttachment(presenceHeaders)
        this.ctx.acceptWebSocket(server, [presenceHeaders.user.id, presenceHeaders.sessionId])

        await this.sendInitialState(server)

        this.broadcastPresenceSnapshot()

        return new Response(null, {
            status: 101,
            webSocket: client
        } as ResponseInit & { webSocket: WebSocket })
    }

    private async getChatMessages(): Promise<RealtimeChatMessage[]> {
        return (await this.ctx.storage.get<RealtimeChatMessage[]>(GLOBAL_CHAT_STORAGE_KEY)) || []
    }

    private getRecentChatMessages(messages: RealtimeChatMessage[]): RealtimeChatMessage[] {
        return messages.slice(-50).reverse()
    }

    private async getLobbyList(): Promise<RealtimeLobbyListItem[]> {
        return listLobbies(this.env.IDENTITY_DB)
    }

    private async sendInitialState(ws: WebSocket): Promise<void> {
        ws.send(
            JSON.stringify({
                type: 'presence.snapshot',
                payload: this.buildSnapshot()
            })
        )

        ws.send(
            JSON.stringify({
                type: 'global.chat.snapshot',
                payload: {
                    messages: this.getRecentChatMessages(await this.getChatMessages())
                }
            })
        )

        ws.send(
            JSON.stringify({
                type: 'global.lobbies.updated',
                payload: {
                    lobbies: await this.getLobbyList()
                }
            })
        )
    }

    private buildSnapshot(): PresenceSnapshot {
        const onlineUsers = new Map<string, PresenceUser>()

        this.ctx.getWebSockets().forEach(socket => {
            const attachment = socket.deserializeAttachment() as PresenceAttachment | null

            if (!attachment) {
                return
            }

            const existingUser = onlineUsers.get(attachment.user.id)

            if (existingUser) {
                existingUser.connections += 1
                return
            }

            onlineUsers.set(attachment.user.id, {
                ...attachment.user,
                connections: 1
            })
        })

        return {
            onlineUsers: Array.from(onlineUsers.values()).sort((a, b) => a.userNickname.localeCompare(b.userNickname)),
            totalConnections: this.ctx.getWebSockets().length,
            updatedAt: new Date().toISOString()
        }
    }

    private broadcastPresenceSnapshot(): void {
        const payload = JSON.stringify({
            type: 'presence.snapshot',
            payload: this.buildSnapshot()
        })

        const staleSockets: WebSocket[] = []

        this.ctx.getWebSockets().forEach(socket => {
            try {
                socket.send(payload)
            } catch (_error) {
                staleSockets.push(socket)
            }
        })

        staleSockets.forEach(socket => {
            try {
                socket.close(1011, 'stale socket')
            } catch (_error) {
                return
            }
        })
    }

    private broadcastGlobalChatMessage(message: RealtimeChatMessage): void {
        const payload = JSON.stringify({
            type: 'global.chat.message',
            payload: message
        })

        this.broadcastToSockets(payload)
    }

    private async broadcastLobbyList(): Promise<void> {
        const payload = JSON.stringify({
            type: 'global.lobbies.updated',
            payload: {
                lobbies: await this.getLobbyList()
            }
        })

        this.broadcastToSockets(payload)
    }

    private broadcastToSockets(payload: string): void {
        const staleSockets: WebSocket[] = []

        this.ctx.getWebSockets().forEach(socket => {
            try {
                socket.send(payload)
            } catch (_error) {
                staleSockets.push(socket)
            }
        })

        staleSockets.forEach(socket => {
            try {
                socket.close(1011, 'stale socket')
            } catch (_error) {
                return
            }
        })
    }
}
