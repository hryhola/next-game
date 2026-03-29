import { DurableObject } from 'cloudflare:workers'
import type { IdentityProfile, PresenceSnapshot, PresenceUser } from '../../../shared/contracts/identity'
import { json } from '../lib/json'
import type { RealtimeWorkerEnv } from '../types'

type PresenceAttachment = {
    connectedAt: string
    sessionId: string
    user: IdentityProfile
}

type PresenceHeaders = PresenceAttachment

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

    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
        const textMessage = typeof message === 'string' ? message : new TextDecoder().decode(message)

        if (textMessage === 'ping') {
            ws.send(JSON.stringify({ type: 'presence.pong' }))
            return
        }

        ws.send(
            JSON.stringify({
                type: 'presence.snapshot',
                payload: this.buildSnapshot()
            })
        )
    }

    webSocketClose(): void {
        this.broadcastSnapshot()
    }

    webSocketError(): void {
        this.broadcastSnapshot()
    }

    private handleWebSocket(request: Request): Response {
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

        server.send(
            JSON.stringify({
                type: 'presence.snapshot',
                payload: this.buildSnapshot()
            })
        )

        this.broadcastSnapshot()

        return new Response(null, {
            status: 101,
            webSocket: client
        } as ResponseInit & { webSocket: WebSocket })
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

    private broadcastSnapshot(): void {
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
}
