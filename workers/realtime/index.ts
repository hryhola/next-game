import type { RegisterIdentityRequest, UpdateIdentityProfileRequest } from '../../shared/contracts/identity'
import type { CreateLobbyRequest } from '../../shared/contracts/realtime-lobby'
import { getIdentitySession, registerIdentity, revokeIdentitySession, updateIdentityProfile } from './auth/store'
import { GlobalPresenceDO } from './durable-objects/GlobalPresenceDO'
import { LobbyRoomDO } from './durable-objects/LobbyRoomDO'
import { clearSessionCookie, createSessionCookie, readSessionToken } from './lib/cookies'
import { json } from './lib/json'
import { listLobbies } from './lobbies/store'
import { playgroundHtml } from './playground'
import type { RealtimeWorkerEnv } from './types'

function getLobbyRoomStub(env: RealtimeWorkerEnv, roomId: string) {
    const id = env.LOBBY_ROOMS.idFromName(roomId)

    return env.LOBBY_ROOMS.get(id)
}

function getGlobalPresenceStub(env: RealtimeWorkerEnv) {
    const id = env.GLOBAL_PRESENCE.idFromName('global')

    return env.GLOBAL_PRESENCE.get(id)
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

function parseLobbyItemRoute(pathname: string): { roomId: string } | null {
    const match = pathname.match(/^\/lobbies\/([^/]+)\/?$/)

    if (!match) {
        return null
    }

    return {
        roomId: decodeURIComponent(match[1])
    }
}

function appendSessionHeaders(headers: Headers, session: ResolvedSession): Headers {
    headers.set('x-session-id', session.sessionId)
    headers.set('x-user-id', session.user.id)
    headers.set('x-user-nickname', session.user.userNickname)
    headers.set('x-user-color', session.user.userColor)

    if (session.user.userAvatarUrl) {
        headers.set('x-user-avatar-url', session.user.userAvatarUrl)
    } else {
        headers.delete('x-user-avatar-url')
    }

    return headers
}

function toRoomRequest(request: Request, roomId: string, targetPath: string, session?: ResolvedSession): Request {
    const url = new URL(request.url)
    url.pathname = targetPath

    const headers = new Headers(request.headers)
    headers.set('x-room-id', roomId)
    headers.delete('authorization')

    if (session) {
        appendSessionHeaders(headers, session)
    }

    const init: RequestInit = {
        method: request.method,
        headers
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
        init.body = request.body
    }

    return new Request(url.toString(), init)
}

function toPresenceRequest(request: Request, session: NonNullable<Awaited<ReturnType<typeof getIdentitySession>>>): Request {
    const url = new URL(request.url)
    url.pathname = '/websocket'

    const headers = appendSessionHeaders(new Headers(request.headers), session)

    return new Request(url.toString(), {
        method: request.method,
        headers
    })
}

async function parseJsonBody<T>(request: Request): Promise<T | null> {
    try {
        return (await request.json()) as T
    } catch (_error) {
        return null
    }
}

function errorResponse(status: number, message: string, code?: string): Response {
    return json(
        {
            ok: false,
            message,
            code
        },
        { status }
    )
}

function methodNotAllowed(...methods: string[]): Response {
    return errorResponse(405, `Method not allowed. Expected: ${methods.join(', ')}`, 'method_not_allowed')
}

type ResolvedSession = NonNullable<Awaited<ReturnType<typeof getIdentitySession>>>

type SessionRequirement =
    | {
          ok: false
          error: Response
          session?: never
          sessionToken?: never
      }
    | {
          ok: true
          error?: never
          session: ResolvedSession
          sessionToken: string
      }

async function requireSession(request: Request, env: RealtimeWorkerEnv): Promise<SessionRequirement> {
    const sessionToken = readSessionToken(request)

    if (!sessionToken) {
        return {
            ok: false,
            error: errorResponse(401, 'Auth token is missing', 'auth_token_missing')
        }
    }

    const session = await getIdentitySession(env.IDENTITY_DB, sessionToken)

    if (!session) {
        return {
            ok: false,
            error: errorResponse(401, 'Invalid auth token', 'auth_token_invalid')
        }
    }

    return {
        ok: true,
        session,
        sessionToken
    }
}

export { GlobalPresenceDO, LobbyRoomDO }

const worker: ExportedHandler<RealtimeWorkerEnv> = {
    async fetch(request: Request, env: RealtimeWorkerEnv): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/playground') {
            return new Response(playgroundHtml, {
                headers: {
                    'content-type': 'text/html; charset=utf-8'
                }
            })
        }

        if (url.pathname === '/') {
            return json({
                ok: true,
                service: 'next-game-realtime',
                endpoints: {
                    playground: '/playground',
                    health: '/health',
                    authRegister: '/auth/register',
                    authSession: '/auth/session',
                    authProfile: '/auth/profile',
                    lobbiesList: '/lobbies',
                    lobbiesCreate: '/lobbies',
                    presenceState: '/presence/state',
                    presenceWebSocketExample: '/presence/websocket',
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

        if (url.pathname === '/auth/register') {
            if (request.method !== 'POST') {
                return methodNotAllowed('POST')
            }

            const body = await parseJsonBody<RegisterIdentityRequest>(request)

            if (!body || typeof body.userNickname !== 'string') {
                return errorResponse(400, 'Invalid register payload', 'invalid_payload')
            }

            try {
                const { session, sessionToken } = await registerIdentity(env.IDENTITY_DB, body.userNickname)

                return json(
                    {
                        ok: true,
                        session,
                        sessionToken
                    },
                    {
                        headers: {
                            'set-cookie': createSessionCookie(sessionToken)
                        }
                    }
                )
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to register identity'
                const status = message === 'Nickname already exists' ? 409 : 400

                return errorResponse(status, message, status === 409 ? 'nickname_taken' : 'register_failed')
            }
        }

        if (url.pathname === '/auth/session') {
            if (request.method !== 'GET') {
                return methodNotAllowed('GET')
            }

            const auth = await requireSession(request, env)

            if (!auth.ok) {
                return auth.error
            }

            return json({
                ok: true,
                session: auth.session
            })
        }

        if (url.pathname === '/auth/logout') {
            if (request.method !== 'POST') {
                return methodNotAllowed('POST')
            }

            const sessionToken = readSessionToken(request)

            if (sessionToken) {
                await revokeIdentitySession(env.IDENTITY_DB, sessionToken)
            }

            return json(
                {
                    ok: true
                },
                {
                    headers: {
                        'set-cookie': clearSessionCookie()
                    }
                }
            )
        }

        if (url.pathname === '/auth/profile') {
            if (!['PATCH', 'POST'].includes(request.method)) {
                return methodNotAllowed('PATCH', 'POST')
            }

            const auth = await requireSession(request, env)

            if (!auth.ok) {
                return auth.error
            }

            const body = await parseJsonBody<UpdateIdentityProfileRequest>(request)

            if (!body) {
                return errorResponse(400, 'Invalid profile payload', 'invalid_payload')
            }

            try {
                const session = await updateIdentityProfile(env.IDENTITY_DB, auth.session, body)

                return json({
                    ok: true,
                    session
                })
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update profile'
                const status = message === 'Nickname already exists' ? 409 : 400

                return errorResponse(status, message, status === 409 ? 'nickname_taken' : 'profile_update_failed')
            }
        }

        if (url.pathname === '/presence/state') {
            if (request.method !== 'GET') {
                return methodNotAllowed('GET')
            }

            const stub = getGlobalPresenceStub(env)

            return stub.fetch(new Request('https://presence.internal/state'))
        }

        if (url.pathname === '/presence/health') {
            if (request.method !== 'GET') {
                return methodNotAllowed('GET')
            }

            const stub = getGlobalPresenceStub(env)

            return stub.fetch(new Request('https://presence.internal/health'))
        }

        if (url.pathname === '/presence/websocket') {
            if (request.method !== 'GET') {
                return methodNotAllowed('GET')
            }

            const auth = await requireSession(request, env)

            if (!auth.ok) {
                return auth.error
            }

            const stub = getGlobalPresenceStub(env)

            return stub.fetch(toPresenceRequest(request, auth.session))
        }

        if (url.pathname === '/lobbies') {
            if (request.method === 'GET') {
                const lobbies = await listLobbies(env.IDENTITY_DB)

                return json({
                    ok: true,
                    lobbies
                })
            }

            if (request.method === 'POST') {
                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                const body = await parseJsonBody<CreateLobbyRequest>(request)

                if (!body || typeof body.roomId !== 'string' || !body.roomId.trim()) {
                    return errorResponse(400, 'Lobby id is required', 'invalid_payload')
                }

                const roomId = body.roomId.trim()
                const stub = getLobbyRoomStub(env, roomId)

                return stub.fetch(
                    toRoomRequest(
                        new Request(request.url, {
                            method: 'POST',
                            headers: request.headers,
                            body: JSON.stringify({
                                ...body,
                                gameName: 'TicTacToe',
                                roomId
                            })
                        }),
                        roomId,
                        '/create',
                        auth.session
                    )
                )
            }

            return methodNotAllowed('GET', 'POST')
        }

        const lobbyRoute = parseLobbyItemRoute(url.pathname)

        if (lobbyRoute) {
            if (request.method !== 'DELETE') {
                return methodNotAllowed('DELETE')
            }

            const auth = await requireSession(request, env)

            if (!auth.ok) {
                return auth.error
            }

            const stub = getLobbyRoomStub(env, lobbyRoute.roomId)

            return stub.fetch(toRoomRequest(request, lobbyRoute.roomId, '/destroy', auth.session))
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

        if (roomRoute.targetPath === '/websocket') {
            const auth = await requireSession(request, env)

            if (!auth.ok) {
                return auth.error
            }

            return stub.fetch(toRoomRequest(request, roomRoute.roomId, roomRoute.targetPath, auth.session))
        }

        return stub.fetch(toRoomRequest(request, roomRoute.roomId, roomRoute.targetPath))
    }
}

export default worker
