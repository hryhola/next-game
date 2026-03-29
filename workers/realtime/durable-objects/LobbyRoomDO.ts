import { DurableObject } from 'cloudflare:workers'
import { json } from '../lib/json'
import type { RealtimeWorkerEnv } from '../types'

type RoomMetadata = {
    roomId: string
    createdAt: string
    lastActivityAt: string
    messageCount: number
}

export class LobbyRoomDO extends DurableObject<RealtimeWorkerEnv> {
    private sockets = new Set<WebSocket>()

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)
        const roomId = request.headers.get('x-room-id') || this.ctx.id.toString()

        if (url.pathname === '/health') {
            const metadata = await this.ensureMetadata(roomId)

            return json({
                ok: true,
                roomId: metadata.roomId,
                createdAt: metadata.createdAt,
                lastActivityAt: metadata.lastActivityAt,
                connections: this.sockets.size
            })
        }

        if (url.pathname === '/state') {
            return this.handleState(roomId)
        }

        if (url.pathname === '/websocket') {
            return this.handleWebSocket(request, roomId)
        }

        return json(
            {
                ok: false,
                message: `Unknown LobbyRoomDO route: ${url.pathname}`
            },
            { status: 404 }
        )
    }

    private async handleState(roomId: string): Promise<Response> {
        const metadata = await this.ensureMetadata(roomId)

        return json({
            ok: true,
            roomId: metadata.roomId,
            createdAt: metadata.createdAt,
            lastActivityAt: metadata.lastActivityAt,
            messageCount: metadata.messageCount,
            connections: this.sockets.size
        })
    }

    private async handleWebSocket(request: Request, roomId: string): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected Upgrade: websocket', { status: 426 })
        }

        await this.touchMetadata(roomId)

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

        server.accept()
        this.sockets.add(server)

        server.addEventListener('message', event => {
            const payload = typeof event.data === 'string' ? event.data : '[binary]'

            void this.touchMetadata(roomId, current => ({
                ...current,
                messageCount: current.messageCount + 1
            }))

            this.broadcast(
                JSON.stringify({
                    type: 'room.message',
                    payload: {
                        roomId,
                        message: payload,
                        connections: this.sockets.size
                    }
                })
            )
        })

        server.addEventListener('close', () => {
            this.sockets.delete(server)
            void this.touchMetadata(roomId)
            this.broadcastPresence(roomId)
        })

        this.broadcastPresence(roomId)

        return new Response(null, {
            status: 101,
            webSocket: client
        } as ResponseInit & { webSocket: WebSocket })
    }

    private async ensureMetadata(roomId: string): Promise<RoomMetadata> {
        const existing = await this.ctx.storage.get<RoomMetadata>('metadata')

        if (existing) {
            return existing
        }

        const now = new Date().toISOString()
        const metadata: RoomMetadata = {
            roomId,
            createdAt: now,
            lastActivityAt: now,
            messageCount: 0
        }

        await this.ctx.storage.put('metadata', metadata)

        return metadata
    }

    private async touchMetadata(roomId: string, transform?: (current: RoomMetadata) => RoomMetadata): Promise<RoomMetadata> {
        const current = await this.ensureMetadata(roomId)
        const next = transform
            ? transform(current)
            : {
                  ...current,
                  lastActivityAt: new Date().toISOString()
              }

        if (transform) {
            next.lastActivityAt = new Date().toISOString()
        }

        await this.ctx.storage.put('metadata', next)

        return next
    }

    private broadcastPresence(roomId: string): void {
        this.broadcast(
            JSON.stringify({
                type: 'room.presence',
                payload: {
                    roomId,
                    connections: this.sockets.size
                }
            })
        )
    }

    private broadcast(message: string): void {
        const staleSockets: WebSocket[] = []

        this.sockets.forEach(socket => {
            try {
                socket.send(message)
            } catch (_error) {
                staleSockets.push(socket)
            }
        })

        staleSockets.forEach(socket => {
            this.sockets.delete(socket)
        })
    }
}
