import { LobbyRoomDO } from './durable-objects/LobbyRoomDO'
import { json } from './lib/json'
import type { RealtimeWorkerEnv } from './types'

function getLobbyRoomStub(env: RealtimeWorkerEnv, roomId: string) {
    const id = env.LOBBY_ROOMS.idFromName(roomId)

    return env.LOBBY_ROOMS.get(id)
}

function parseRoomRoute(pathname: string): { roomId: string; targetPath: '/state' | '/websocket' | '/health' } | null {
    const match = pathname.match(/^\/rooms\/([^/]+)(?:\/(state|websocket|health))?\/?$/)

    if (!match) {
        return null
    }

    return {
        roomId: decodeURIComponent(match[1]),
        targetPath: match[2] ? (`/${match[2]}` as '/state' | '/websocket' | '/health') : '/state'
    }
}

function toRoomRequest(request: Request, roomId: string, targetPath: '/state' | '/websocket' | '/health'): Request {
    const url = new URL(request.url)
    url.pathname = targetPath

    const headers = new Headers(request.headers)
    headers.set('x-room-id', roomId)

    const init: RequestInit = {
        method: request.method,
        headers
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
        init.body = request.body
    }

    return new Request(url.toString(), init)
}

export { LobbyRoomDO }

const worker: ExportedHandler<RealtimeWorkerEnv> = {
    async fetch(request: Request, env: RealtimeWorkerEnv): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/') {
            return json({
                ok: true,
                service: 'next-game-realtime',
                endpoints: {
                    health: '/health',
                    roomStateExample: '/rooms/example-room/state',
                    roomWebSocketExample: '/rooms/example-room/websocket'
                }
            })
        }

        if (url.pathname === '/health') {
            return json({
                ok: true,
                service: 'next-game-realtime'
            })
        }

        const roomRoute = parseRoomRoute(url.pathname)

        if (!roomRoute) {
            return json(
                {
                    ok: false,
                    message: `Unknown route: ${url.pathname}`
                },
                { status: 404 }
            )
        }

        const stub = getLobbyRoomStub(env, roomRoute.roomId)

        return stub.fetch(toRoomRequest(request, roomRoute.roomId, roomRoute.targetPath))
    }
}

export default worker
