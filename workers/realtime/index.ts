import type { RegisterIdentityRequest, UpdateIdentityProfileRequest } from '../../shared/contracts/identity'
import type { CreateLobbyRequest } from '../../shared/contracts/realtime-lobby'
import { R2AssetStore } from './assets/store'
import { getIdentitySession, registerIdentity, revokeIdentitySession, updateIdentityProfile } from './auth/store'
import { GlobalPresenceDO } from './durable-objects/GlobalPresenceDO'
import { LobbyRoomDO } from './durable-objects/LobbyRoomDO'
import { parseJeopardyPackArchive } from './jeopardy/pack'
import { clearSessionCookie, createSessionCookie, readSessionToken } from './lib/cookies'
import { json } from './lib/json'
import { listLobbies } from './lobbies/store'
import { playgroundHtml } from './playground'
import { listRoomSessions } from './room-sessions/store'
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

function parseRoomHistoryRoute(pathname: string): { roomId: string } | null {
    const match = pathname.match(/^\/rooms\/([^/]+)\/history\/?$/)

    if (!match) {
        return null
    }

    return {
        roomId: decodeURIComponent(match[1])
    }
}

function parseAssetRoute(pathname: string): { assetId: string } | null {
    const match = pathname.match(/^\/assets\/([^/]+)\/?$/)

    if (!match) {
        return null
    }

    return {
        assetId: decodeURIComponent(match[1])
    }
}

type LobbyActionPath = '/join' | '/leave' | '/destroy'

function parseLobbyItemRoute(pathname: string): { roomId: string; action: LobbyActionPath } | null {
    const match = pathname.match(/^\/lobbies\/([^/]+)(?:\/(join|leave))?\/?$/)

    if (!match) {
        return null
    }

    return {
        roomId: decodeURIComponent(match[1]),
        action: match[2] ? (`/${match[2]}` as LobbyActionPath) : '/destroy'
    }
}

function createCorsHeaders(request: Request): Headers {
    const headers = new Headers()
    const origin = request.headers.get('origin')

    headers.set('access-control-allow-origin', origin || '*')
    headers.set('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    headers.set('access-control-allow-headers', 'authorization,content-type')
    headers.set('access-control-expose-headers', 'content-type,set-cookie')
    headers.set('vary', 'origin')

    return headers
}

function withCors(request: Request, response: Response): Response {
    if (response.status === 101) {
        return response
    }

    const headers = new Headers(response.headers)

    createCorsHeaders(request).forEach((value, key) => {
        headers.set(key, value)
    })

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    })
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

function toGlobalPresenceRequest(
    request: Request,
    targetPath: '/chat' | '/websocket',
    session?: NonNullable<Awaited<ReturnType<typeof getIdentitySession>>>
): Request {
    const url = new URL(request.url)
    url.pathname = targetPath

    const headers = new Headers(request.headers)

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

function isMultipartFormRequest(request: Request): boolean {
    return (request.headers.get('content-type') || '').includes('multipart/form-data')
}

function readOptionalFormText(formData: FormData, key: string): string | undefined {
    const value = formData.get(key)

    if (typeof value !== 'string') {
        return undefined
    }

    const trimmed = value.trim()

    return trimmed || undefined
}

function createAssetStore(env: RealtimeWorkerEnv, request: Request): R2AssetStore {
    return new R2AssetStore(env.IDENTITY_DB, env.ASSETS_BUCKET, new URL(request.url).origin)
}

function toRangeHeader(range: R2Range, size: number): string {
    if ('suffix' in range) {
        const start = Math.max(size - range.suffix, 0)
        const end = Math.max(size - 1, 0)

        return `bytes ${start}-${end}/${size}`
    }

    const start = range.offset || 0
    const end = range.length ? Math.min(start + range.length - 1, size - 1) : Math.max(size - 1, 0)

    return `bytes ${start}-${end}/${size}`
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
        const assetStore = createAssetStore(env, request)

        if (request.method === 'OPTIONS') {
            return withCors(request, new Response(null, { status: 204 }))
        }

        if (url.pathname === '/playground') {
            return withCors(
                request,
                new Response(playgroundHtml, {
                    headers: {
                        'content-type': 'text/html; charset=utf-8'
                    }
                })
            )
        }

        const response = await (async () => {
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
                        globalChat: '/chat/global',
                        lobbiesList: '/lobbies',
                        lobbiesCreate: '/lobbies',
                        lobbyJoinExample: '/lobbies/example-room/join',
                        lobbyLeaveExample: '/lobbies/example-room/leave',
                        presenceState: '/presence/state',
                        presenceWebSocketExample: '/presence/websocket',
                        roomStateExample: '/rooms/example-room/state',
                        roomHistoryExample: '/rooms/example-room/history',
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

            const assetRoute = parseAssetRoute(url.pathname)

            if (assetRoute) {
                if (!['GET', 'HEAD'].includes(request.method)) {
                    return methodNotAllowed('GET', 'HEAD')
                }

                const asset = await assetStore.getObjectRow(assetRoute.assetId)

                if (!asset || asset.visibility !== 'public') {
                    return errorResponse(404, 'Asset not found', 'asset_not_found')
                }

                const object = await env.ASSETS_BUCKET.get(asset.bucketKey, {
                    onlyIf: request.headers,
                    range: request.headers
                })

                if (object === null) {
                    return errorResponse(404, 'Asset not found', 'asset_not_found')
                }

                const headers = new Headers()
                object.writeHttpMetadata(headers)
                headers.set('etag', object.httpEtag)
                headers.set('accept-ranges', 'bytes')
                headers.set('cache-control', headers.get('cache-control') || 'public, max-age=31536000, immutable')

                if (object.range) {
                    headers.set('content-range', toRangeHeader(object.range, asset.size))
                }

                return new Response('body' in object && request.method !== 'HEAD' ? object.body : undefined, {
                    status: request.headers.has('range') && object.range ? 206 : 'body' in object ? 200 : 412,
                    headers
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

                let body: UpdateIdentityProfileRequest | null = null
                let avatarFile: File | null = null

                if (isMultipartFormRequest(request)) {
                    const formData = await request.formData().catch(() => null)

                    if (!formData) {
                        return errorResponse(400, 'Invalid profile form payload', 'invalid_payload')
                    }

                    const image = formData.get('image')

                    body = {
                        userColor: readOptionalFormText(formData, 'userColor'),
                        userNickname: readOptionalFormText(formData, 'userNickname')
                    }

                    if (image instanceof File && image.size > 0) {
                        avatarFile = image
                    }
                } else {
                    body = await parseJsonBody<UpdateIdentityProfileRequest>(request)
                }

                if (!body) {
                    return errorResponse(400, 'Invalid profile payload', 'invalid_payload')
                }

                try {
                    let nextPatch = body
                    let uploadedAvatar: Awaited<ReturnType<R2AssetStore['put']>> | null = null

                    if (avatarFile) {
                        if (!avatarFile.type.startsWith('image/')) {
                            return errorResponse(400, 'Avatar must be an image file', 'invalid_avatar_file')
                        }

                        if (avatarFile.size > 5 * 1024 * 1024) {
                            return errorResponse(413, 'Avatar must be 5MB or smaller', 'avatar_too_large')
                        }

                        uploadedAvatar = await assetStore.put({
                            body: avatarFile.stream(),
                            contentType: avatarFile.type || 'application/octet-stream',
                            fileName: avatarFile.name || 'avatar',
                            kind: 'avatar',
                            ownerId: auth.session.user.id,
                            ownerType: 'user',
                            size: avatarFile.size,
                            uploadedByUserId: auth.session.user.id
                        })

                        nextPatch = {
                            ...body,
                            userAvatarUrl: uploadedAvatar.url
                        }
                    }

                    let session

                    try {
                        session = await updateIdentityProfile(env.IDENTITY_DB, auth.session, nextPatch)
                    } catch (error) {
                        if (uploadedAvatar) {
                            await assetStore.delete(uploadedAvatar.id).catch(() => undefined)
                        }

                        throw error
                    }

                    if (uploadedAvatar) {
                        const ownerAssets = await assetStore.listActiveByOwner('user', auth.session.user.id, 'avatar')

                        await Promise.allSettled(ownerAssets.filter(asset => asset.id !== uploadedAvatar!.id).map(asset => assetStore.delete(asset.id)))
                    }

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

                return stub.fetch(toGlobalPresenceRequest(request, '/websocket', auth.session))
            }

            if (url.pathname === '/chat/global') {
                const stub = getGlobalPresenceStub(env)

                if (request.method === 'GET') {
                    return stub.fetch(toGlobalPresenceRequest(request, '/chat'))
                }

                if (request.method !== 'POST') {
                    return methodNotAllowed('GET', 'POST')
                }

                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                return stub.fetch(toGlobalPresenceRequest(request, '/chat', auth.session))
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

                    if (isMultipartFormRequest(request)) {
                        const formData = await request.formData()
                        const roomId = String(formData.get('lobbyId') || '').trim()
                        const name = String(formData.get('lobbyId') || '').trim()
                        const password = readOptionalFormText(formData, 'password')
                        const gameName = String(formData.get('gameName') || '').trim()

                        if (!roomId) {
                            return errorResponse(400, 'Lobby id is required', 'invalid_payload')
                        }

                        if (gameName !== 'Jeopardy') {
                            return errorResponse(400, `Multipart lobby creation is only supported for Jeopardy`, 'invalid_game')
                        }

                        const packFile = formData.get('initialData-pack')

                        if (!(packFile instanceof File)) {
                            return errorResponse(400, 'Jeopardy pack is required', 'missing_pack')
                        }

                        const packBytes = await packFile.arrayBuffer()
                        const parsedPack = await parseJeopardyPackArchive(packBytes)
                        const assetStore = createAssetStore(env, request)
                        const storedPack = await assetStore.put({
                            body: packBytes,
                            contentType: packFile.type || 'application/octet-stream',
                            fileName: packFile.name,
                            kind: 'jeopardy-pack',
                            ownerId: roomId,
                            ownerType: 'lobby',
                            size: packFile.size,
                            uploadedByUserId: auth.session.user.id
                        })

                        const stub = getLobbyRoomStub(env, roomId)

                        return stub.fetch(
                            toRoomRequest(
                                new Request(request.url, {
                                    method: 'POST',
                                    headers: {
                                        'content-type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        gameName: 'Jeopardy',
                                        initialData: {
                                            pack: {
                                                assetId: storedPack.id,
                                                author: parsedPack.author,
                                                dateCreated: parsedPack.dateCreated,
                                                declaration: parsedPack.declaration,
                                                fileName: storedPack.fileName,
                                                value: storedPack.url
                                            }
                                        },
                                        name,
                                        password,
                                        roomId
                                    } as CreateLobbyRequest)
                                }),
                                roomId,
                                '/create',
                                auth.session
                            )
                        )
                    }

                    const body = await parseJsonBody<CreateLobbyRequest>(request)

                    if (!body || typeof body.roomId !== 'string' || !body.roomId.trim()) {
                        return errorResponse(400, 'Lobby id is required', 'invalid_payload')
                    }

                    if (body.gameName && !['TicTacToe', 'Clicker', 'Jeopardy'].includes(body.gameName)) {
                        return errorResponse(400, `Unsupported game: ${body.gameName}`, 'invalid_game')
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
                                    gameName: body.gameName === 'Clicker' ? 'Clicker' : body.gameName === 'Jeopardy' ? 'Jeopardy' : 'TicTacToe',
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
                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                const stub = getLobbyRoomStub(env, lobbyRoute.roomId)

                if (lobbyRoute.action === '/destroy') {
                    if (request.method !== 'DELETE') {
                        return methodNotAllowed('DELETE')
                    }

                    return stub.fetch(toRoomRequest(request, lobbyRoute.roomId, '/destroy', auth.session))
                }

                if (request.method !== 'POST') {
                    return methodNotAllowed('POST')
                }

                return stub.fetch(toRoomRequest(request, lobbyRoute.roomId, lobbyRoute.action, auth.session))
            }

            const roomHistoryRoute = parseRoomHistoryRoute(url.pathname)

            if (roomHistoryRoute) {
                if (request.method !== 'GET') {
                    return methodNotAllowed('GET')
                }

                const history = await listRoomSessions(env.IDENTITY_DB, roomHistoryRoute.roomId)

                return json({
                    ok: true,
                    history,
                    roomId: roomHistoryRoute.roomId
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

            if (roomRoute.targetPath === '/websocket') {
                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                return stub.fetch(toRoomRequest(request, roomRoute.roomId, roomRoute.targetPath, auth.session))
            }

            if (roomRoute.targetPath === '/state') {
                const sessionToken = readSessionToken(request)

                if (sessionToken) {
                    const session = await getIdentitySession(env.IDENTITY_DB, sessionToken)

                    if (session) {
                        return stub.fetch(toRoomRequest(request, roomRoute.roomId, roomRoute.targetPath, session))
                    }
                }
            }

            return stub.fetch(toRoomRequest(request, roomRoute.roomId, roomRoute.targetPath))
        })()

        return withCors(request, response)
    }
}

export default worker
