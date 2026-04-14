import type { AdminAssetPurgeSummary, AdminLobbyListItem } from '../../shared/contracts/http-api'
import type { RegisterIdentityRequest, UpdateIdentityProfileRequest } from '../../shared/contracts/identity'
import type { CreateLobbyRequest, RealtimeLobbySnapshot } from '../../shared/contracts/realtime-lobby'
import { matchesBasicAuthHeader } from '../../shared/lib/basicAuth'
import { extractAssetIdFromUrl, getReferencedAssetIdsFromLobbySnapshot } from './assets/references'
import { R2AssetStore, type PreparedMultipartAssetUpload } from './assets/store'
import {
    destroyIdentityUser,
    getIdentitySession,
    listIdentityAvatarUrls,
    listIdentityUsers,
    registerIdentity,
    revokeIdentitySession,
    updateIdentityProfile
} from './auth/store'
import { GlobalPresenceDO } from './durable-objects/GlobalPresenceDO'
import { LobbyDO } from './durable-objects/LobbyDO'
import { parseJeopardyPackArchive, validateJeopardyPackCompatibility } from './jeopardy/pack'
import { clearSessionCookie, createSessionCookie, readSessionToken } from './lib/cookies'
import { encodeHeaderValue } from './lib/headerEncoding'
import { json } from './lib/json'
import { listLobbies } from './lobbies/store'
import { playgroundHtml } from './playground'
import { listLobbySessions } from './lobby-sessions/store'
import type { RealtimeWorkerEnv } from './types'

function getLobbyStub(env: RealtimeWorkerEnv, lobbyId: string) {
    const id = env.LOBBIES.idFromName(lobbyId)

    return env.LOBBIES.get(id)
}

function getGlobalPresenceStub(env: RealtimeWorkerEnv) {
    const id = env.GLOBAL_PRESENCE.idFromName('global')

    return env.GLOBAL_PRESENCE.get(id)
}

function parseLobbyRoute(pathname: string): { lobbyId: string; targetPath: '/state' | '/websocket' | '/health' } | null {
    const match = pathname.match(/^\/lobbies\/([^/]+)(?:\/(state|websocket|health))?\/?$/)

    if (!match) {
        return null
    }

    return {
        lobbyId: decodeURIComponent(match[1]),
        targetPath: match[2] ? (`/${match[2]}` as '/state' | '/websocket' | '/health') : '/state'
    }
}

function parseLobbyHistoryRoute(pathname: string): { lobbyId: string } | null {
    const match = pathname.match(/^\/lobbies\/([^/]+)\/history\/?$/)

    if (!match) {
        return null
    }

    return {
        lobbyId: decodeURIComponent(match[1])
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

function parseAdminUserRoute(pathname: string): { userId: string } | null {
    const match = pathname.match(/^\/admin\/users\/([^/]+)\/?$/)

    if (!match) {
        return null
    }

    return {
        userId: decodeURIComponent(match[1])
    }
}

function parseAdminLobbyRoute(pathname: string): { lobbyId: string } | null {
    const match = pathname.match(/^\/admin\/lobbies\/([^/]+)\/?$/)

    if (!match) {
        return null
    }

    return {
        lobbyId: decodeURIComponent(match[1])
    }
}

type JeopardyPackUploadRoute =
    | {
          kind: 'collection'
      }
    | {
          kind: 'item'
          uploadId: string
      }
    | {
          kind: 'complete'
          uploadId: string
      }
    | {
          kind: 'part'
          partNumber: number
          uploadId: string
      }

function parseJeopardyPackUploadRoute(pathname: string): JeopardyPackUploadRoute | null {
    if (pathname === '/jeopardy/packs/uploads' || pathname === '/jeopardy/packs/uploads/') {
        return {
            kind: 'collection'
        }
    }

    const partMatch = pathname.match(/^\/jeopardy\/packs\/uploads\/([^/]+)\/parts\/(\d+)\/?$/)

    if (partMatch) {
        return {
            kind: 'part',
            partNumber: Number(partMatch[2]),
            uploadId: decodeURIComponent(partMatch[1])
        }
    }

    const completeMatch = pathname.match(/^\/jeopardy\/packs\/uploads\/([^/]+)\/complete\/?$/)

    if (completeMatch) {
        return {
            kind: 'complete',
            uploadId: decodeURIComponent(completeMatch[1])
        }
    }

    const itemMatch = pathname.match(/^\/jeopardy\/packs\/uploads\/([^/]+)\/?$/)

    if (itemMatch) {
        return {
            kind: 'item',
            uploadId: decodeURIComponent(itemMatch[1])
        }
    }

    return null
}

type LobbyActionPath = '/join' | '/leave' | '/destroy'

function parseLobbyItemRoute(pathname: string): { lobbyId: string; action: LobbyActionPath } | null {
    const match = pathname.match(/^\/lobbies\/([^/]+)(?:\/(join|leave))?\/?$/)

    if (!match) {
        return null
    }

    return {
        lobbyId: decodeURIComponent(match[1]),
        action: match[2] ? (`/${match[2]}` as LobbyActionPath) : '/destroy'
    }
}

function createCorsHeaders(request: Request): Headers {
    const headers = new Headers()
    const origin = request.headers.get('origin')

    headers.set('access-control-allow-origin', origin || '*')
    headers.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
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
    headers.set('x-user-nickname', encodeHeaderValue(session.user.userNickname))
    headers.set('x-user-color', encodeHeaderValue(session.user.userColor))

    if (session.user.userAvatarUrl) {
        headers.set('x-user-avatar-url', encodeHeaderValue(session.user.userAvatarUrl))
    } else {
        headers.delete('x-user-avatar-url')
    }

    return headers
}

function toLobbyRequest(request: Request, lobbyId: string, targetPath: string, session?: ResolvedSession): Request {
    const url = new URL(request.url)
    url.pathname = targetPath

    const headers = new Headers(request.headers)
    headers.set('x-lobby-id', encodeHeaderValue(lobbyId))
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

function readOptionalFormFile(formData: FormData, key: string): File | undefined {
    const value = formData.get(key)

    if (!(value instanceof File) || !value.size || !value.name.trim()) {
        return undefined
    }

    return value
}

function createAssetStore(env: RealtimeWorkerEnv, request: Request): R2AssetStore {
    return new R2AssetStore(env.IDENTITY_DB, env.ASSETS_BUCKET, new URL(request.url).origin)
}

type AssetMetadataRow = {
    assetId: string
    bucketKey: string
    deletedAt: string | null
}

async function listAllAssetMetadataRows(db: D1Database): Promise<AssetMetadataRow[]> {
    const result = await db
        .prepare(
            `
                SELECT
                    id as assetId,
                    bucket_key as bucketKey,
                    deleted_at as deletedAt
                FROM assets
            `
        )
        .all<AssetMetadataRow>()

    return result.results || []
}

async function collectReferencedAssetIds(
    env: RealtimeWorkerEnv,
    assetStore: R2AssetStore
): Promise<{
    fallbackLobbyCount: number
    referencedAssetIds: Set<string>
    scannedLobbyCount: number
    scannedUserAvatarCount: number
}> {
    const referencedAssetIds = new Set<string>()
    const avatarUrls = await listIdentityAvatarUrls(env.IDENTITY_DB)

    avatarUrls.forEach(url => {
        const assetId = extractAssetIdFromUrl(url)

        if (assetId) {
            referencedAssetIds.add(assetId)
        }
    })

    const lobbies = await listLobbies(env.IDENTITY_DB)
    let fallbackLobbyCount = 0

    for (const lobby of lobbies) {
        try {
            const stateResponse = await getLobbyStub(env, lobby.id).fetch(new Request('https://lobby.internal/state'))

            if (!stateResponse.ok) {
                throw new Error(`Failed to inspect lobby ${lobby.id}`)
            }

            const stateBody = (await stateResponse.json().catch(() => null)) as { lobby?: RealtimeLobbySnapshot | null } | null

            if (!stateBody?.lobby) {
                throw new Error(`Lobby ${lobby.id} returned an invalid state payload`)
            }

            getReferencedAssetIdsFromLobbySnapshot(stateBody.lobby).forEach(assetId => referencedAssetIds.add(assetId))
        } catch (_error) {
            fallbackLobbyCount += 1

            const fallbackAssets = await assetStore.listActiveByOwner('lobby', lobby.id)

            fallbackAssets.forEach(asset => referencedAssetIds.add(asset.id))
        }
    }

    return {
        fallbackLobbyCount,
        referencedAssetIds,
        scannedLobbyCount: lobbies.length,
        scannedUserAvatarCount: avatarUrls.length
    }
}

async function purgeUnusedAssets(env: RealtimeWorkerEnv, assetStore: R2AssetStore): Promise<AdminAssetPurgeSummary> {
    const { fallbackLobbyCount, referencedAssetIds, scannedLobbyCount, scannedUserAvatarCount } = await collectReferencedAssetIds(env, assetStore)
    const assetRows = await listAllAssetMetadataRows(env.IDENTITY_DB)
    const activeAssetRows = assetRows.filter(row => !row.deletedAt)
    const activeAssetRowsById = new Map(activeAssetRows.map(row => [row.assetId, row]))
    const deletedBucketKeys = new Set<string>()
    let deletedAssetCount = 0

    for (const row of activeAssetRows) {
        if (referencedAssetIds.has(row.assetId)) {
            continue
        }

        await assetStore.delete(row.assetId)
        deletedBucketKeys.add(row.bucketKey)
        deletedAssetCount += 1
    }

    const keptBucketKeys = new Set<string>()

    referencedAssetIds.forEach(assetId => {
        const row = activeAssetRowsById.get(assetId)

        if (row) {
            keptBucketKeys.add(row.bucketKey)
        }
    })

    let deletedBucketObjectCount = 0
    let scannedBucketObjectCount = 0
    let cursor: string | undefined

    do {
        const bucketPage = await env.ASSETS_BUCKET.list(cursor ? { cursor } : undefined)

        for (const object of bucketPage.objects) {
            scannedBucketObjectCount += 1

            if (keptBucketKeys.has(object.key) || deletedBucketKeys.has(object.key)) {
                continue
            }

            await env.ASSETS_BUCKET.delete(object.key)
            deletedBucketObjectCount += 1
        }

        cursor = bucketPage.truncated ? bucketPage.cursor : undefined
    } while (cursor)

    return {
        deletedAssetCount,
        deletedBucketObjectCount,
        fallbackLobbyCount,
        referencedAssetCount: referencedAssetIds.size,
        scannedBucketObjectCount,
        scannedLobbyCount,
        scannedUserAvatarCount
    }
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

function isValidPreparedMultipartAssetUpload(value: unknown): value is PreparedMultipartAssetUpload {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as Partial<PreparedMultipartAssetUpload>

    return (
        typeof candidate.assetId === 'string' &&
        typeof candidate.bucketKey === 'string' &&
        typeof candidate.contentType === 'string' &&
        typeof candidate.fileName === 'string' &&
        typeof candidate.kind === 'string' &&
        typeof candidate.ownerId === 'string' &&
        typeof candidate.ownerType === 'string' &&
        typeof candidate.size === 'number' &&
        Number.isFinite(candidate.size) &&
        typeof candidate.uploadId === 'string' &&
        candidate.visibility === 'public'
    )
}

function methodNotAllowed(...methods: string[]): Response {
    return errorResponse(405, `Method not allowed. Expected: ${methods.join(', ')}`, 'method_not_allowed')
}

type ResolvedSession = NonNullable<Awaited<ReturnType<typeof getIdentitySession>>>

type SessionRequirement = {
    ok: false
    error: Response
    session?: never
    sessionToken?: never
}

type AdminRequirement =
    | {
          ok: false
          error: Response
      }
    | {
          ok: true
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

function createAdminAuthErrorResponse(status: number, message: string, code: string): Response {
    return json(
        {
            ok: false,
            message,
            code
        },
        {
            status,
            headers: {
                'www-authenticate': 'Basic realm="Admin", charset="UTF-8"'
            }
        }
    )
}

async function requireAdminBasicAuth(request: Request, env: RealtimeWorkerEnv): Promise<AdminRequirement> {
    const username = env.ADMIN_USERNAME?.trim()
    const password = env.ADMIN_PASSWORD?.trim()

    if (!username || !password) {
        return {
            ok: false,
            error: createAdminAuthErrorResponse(503, 'Admin credentials are not configured', 'admin_auth_missing')
        }
    }

    if (
        !matchesBasicAuthHeader(request.headers.get('authorization'), {
            password,
            username
        })
    ) {
        return {
            ok: false,
            error: createAdminAuthErrorResponse(401, 'Admin authentication is required', 'admin_auth_required')
        }
    }

    return {
        ok: true
    }
}

export { GlobalPresenceDO, LobbyDO }

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
                        lobbyStateExample: '/lobbies/example-room/state',
                        lobbyHistoryExample: '/lobbies/example-room/history',
                        lobbyWebSocketExample: '/lobbies/example-room/websocket'
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

            if (url.pathname === '/jeopardy/packs/validate') {
                if (request.method !== 'POST') {
                    return methodNotAllowed('POST')
                }

                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                if (!isMultipartFormRequest(request)) {
                    return errorResponse(400, 'Jeopardy pack validation requires multipart form data', 'invalid_payload')
                }

                const formData = await request.formData()
                const packFile = readOptionalFormFile(formData, 'pack')

                if (!packFile) {
                    return errorResponse(400, 'Jeopardy pack is required', 'missing_pack')
                }

                try {
                    const packBytes = await packFile.arrayBuffer()
                    const parsedPack = await parseJeopardyPackArchive(packBytes)
                    const compatibility = validateJeopardyPackCompatibility(parsedPack.declaration)

                    return json({
                        compatible: compatibility.compatible,
                        ok: true,
                        reason: compatibility.compatible ? undefined : compatibility.reason
                    })
                } catch (error) {
                    return json({
                        compatible: false,
                        ok: true,
                        reason: error instanceof Error ? error.message : 'Failed to parse Jeopardy pack'
                    })
                }
            }

            const jeopardyPackUploadRoute = parseJeopardyPackUploadRoute(url.pathname)

            if (jeopardyPackUploadRoute) {
                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                const session = (auth as unknown as { session: ResolvedSession }).session
                const assetStore = createAssetStore(env, request)

                if (jeopardyPackUploadRoute.kind === 'collection') {
                    if (request.method !== 'POST') {
                        return methodNotAllowed('POST')
                    }

                    const body = await parseJsonBody<{
                        contentType?: string
                        fileName?: string
                        lobbyId?: string
                        size?: number
                    }>(request)
                    const lobbyId = typeof body?.lobbyId === 'string' ? body.lobbyId.trim() : ''
                    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : ''
                    const size = typeof body?.size === 'number' ? body.size : Number.NaN

                    if (!lobbyId || !fileName || !Number.isFinite(size) || size <= 0) {
                        return errorResponse(400, 'Invalid Jeopardy pack upload payload', 'invalid_payload')
                    }

                    const upload = await assetStore.createMultipartUpload({
                        contentType: typeof body?.contentType === 'string' && body.contentType.trim() ? body.contentType.trim() : 'application/octet-stream',
                        fileName,
                        kind: 'jeopardy-pack',
                        ownerId: lobbyId,
                        ownerType: 'lobby',
                        size,
                        uploadedByUserId: session.user.id,
                        visibility: 'public'
                    })

                    return json({
                        ok: true,
                        upload
                    })
                }

                if (jeopardyPackUploadRoute.kind === 'part') {
                    if (request.method !== 'PUT') {
                        return methodNotAllowed('PUT')
                    }

                    const bucketKey = url.searchParams.get('key')?.trim()

                    if (!bucketKey || !Number.isInteger(jeopardyPackUploadRoute.partNumber) || jeopardyPackUploadRoute.partNumber < 1) {
                        return errorResponse(400, 'Invalid Jeopardy upload part request', 'invalid_payload')
                    }

                    if (!request.body) {
                        return errorResponse(400, 'Jeopardy upload part body is required', 'invalid_payload')
                    }

                    try {
                        const part = await assetStore.uploadMultipartPart({
                            body: request.body,
                            bucketKey,
                            partNumber: jeopardyPackUploadRoute.partNumber,
                            uploadId: jeopardyPackUploadRoute.uploadId
                        })

                        return json({
                            ok: true,
                            part: {
                                etag: part.etag,
                                partNumber: part.partNumber
                            }
                        })
                    } catch (error) {
                        return errorResponse(400, error instanceof Error ? error.message : 'Failed to upload Jeopardy pack part', 'multipart_upload_failed')
                    }
                }

                if (jeopardyPackUploadRoute.kind === 'complete') {
                    if (request.method !== 'POST') {
                        return methodNotAllowed('POST')
                    }

                    const body = await parseJsonBody<{
                        upload?: unknown
                        uploadedParts?: Array<{
                            etag?: string
                            partNumber?: number
                        }>
                    }>(request)

                    if (!isValidPreparedMultipartAssetUpload(body?.upload)) {
                        return errorResponse(400, 'Invalid Jeopardy upload completion payload', 'invalid_payload')
                    }

                    const upload = body.upload

                    if (
                        upload.kind !== 'jeopardy-pack' ||
                        upload.ownerType !== 'lobby' ||
                        upload.uploadId !== jeopardyPackUploadRoute.uploadId ||
                        (upload.uploadedByUserId && upload.uploadedByUserId !== session.user.id)
                    ) {
                        return errorResponse(400, 'Jeopardy upload metadata is not valid', 'invalid_payload')
                    }

                    const uploadedParts = (body?.uploadedParts || [])
                        .map(part => ({
                            etag: typeof part?.etag === 'string' ? part.etag.trim() : '',
                            partNumber: typeof part?.partNumber === 'number' ? part.partNumber : Number.NaN
                        }))
                        .filter(part => part.etag && Number.isInteger(part.partNumber) && part.partNumber > 0)
                        .sort((left, right) => left.partNumber - right.partNumber) as R2UploadedPart[]

                    if (!uploadedParts.length) {
                        return errorResponse(400, 'Jeopardy upload completion requires uploaded parts', 'invalid_payload')
                    }

                    try {
                        const asset = await assetStore.completeMultipartUpload({
                            ...upload,
                            uploadedParts
                        })

                        return json({
                            asset,
                            ok: true
                        })
                    } catch (error) {
                        return errorResponse(400, error instanceof Error ? error.message : 'Failed to finalize Jeopardy pack upload', 'multipart_upload_failed')
                    }
                }

                if (request.method !== 'DELETE') {
                    return methodNotAllowed('DELETE')
                }

                const bucketKey = url.searchParams.get('key')?.trim()

                if (!bucketKey) {
                    return errorResponse(400, 'Jeopardy upload key is required', 'invalid_payload')
                }

                try {
                    await assetStore.abortMultipartUpload(bucketKey, jeopardyPackUploadRoute.uploadId)
                } catch (_error) {
                    // The upload may already be finalized or missing; abort remains best-effort cleanup.
                }

                return json({
                    ok: true
                })
            }

            if (url.pathname === '/admin/state') {
                if (request.method !== 'GET') {
                    return methodNotAllowed('GET')
                }

                const auth = await requireAdminBasicAuth(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                const users = await listIdentityUsers(env.IDENTITY_DB)
                const lobbies = await listLobbies(env.IDENTITY_DB)
                const adminLobbies = await Promise.all(
                    lobbies.map(async lobby => {
                        let onlineUsers = 0

                        try {
                            const healthResponse = await getLobbyStub(env, lobby.id).fetch(new Request('https://lobby.internal/health'))

                            if (healthResponse.ok) {
                                const health = (await healthResponse.json()) as { onlineUsers?: number }

                                if (typeof health.onlineUsers === 'number') {
                                    onlineUsers = health.onlineUsers
                                }
                            }
                        } catch (_error) {
                            onlineUsers = 0
                        }

                        const adminLobby: AdminLobbyListItem = {
                            createdAt: lobby.createdAt,
                            id: lobby.id,
                            membersCount: lobby.membersCount,
                            name: lobby.name,
                            onlineUsers,
                            updatedAt: lobby.updatedAt
                        }

                        return adminLobby
                    })
                )

                return json({
                    ok: true,
                    lobbies: adminLobbies,
                    users
                })
            }

            if (url.pathname === '/admin/assets/purge') {
                if (request.method !== 'POST') {
                    return methodNotAllowed('POST')
                }

                const auth = await requireAdminBasicAuth(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                const summary = await purgeUnusedAssets(env, assetStore)

                return json({
                    ok: true,
                    summary
                })
            }

            const adminUserRoute = parseAdminUserRoute(url.pathname)

            if (adminUserRoute) {
                if (request.method !== 'DELETE') {
                    return methodNotAllowed('DELETE')
                }

                const auth = await requireAdminBasicAuth(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                const existingUsers = await listIdentityUsers(env.IDENTITY_DB)

                if (!existingUsers.some(user => user.id === adminUserRoute.userId)) {
                    return errorResponse(404, 'User not found', 'user_not_found')
                }

                const lobbies = await listLobbies(env.IDENTITY_DB)

                for (const lobby of lobbies) {
                    const response = await getLobbyStub(env, lobby.id).fetch(
                        new Request('https://lobby.internal/admin/remove-member', {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: adminUserRoute.userId
                            })
                        })
                    )

                    if (!response.ok) {
                        const responseBody = (await response.json().catch(() => null)) as { message?: string } | null

                        return errorResponse(
                            500,
                            responseBody?.message || `Failed to remove user ${adminUserRoute.userId} from active lobbies`,
                            'admin_user_cleanup_failed'
                        )
                    }
                }

                try {
                    await getGlobalPresenceStub(env).fetch(
                        new Request('https://presence.internal/admin/disconnect-user', {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: adminUserRoute.userId
                            })
                        })
                    )
                } catch (_error) {
                    // Presence disconnect is best-effort; deleting the user remains the source of truth.
                }

                const userAssets = await assetStore.listActiveByOwner('user', adminUserRoute.userId)
                await Promise.allSettled(userAssets.map(asset => assetStore.delete(asset.id)))

                const deleted = await destroyIdentityUser(env.IDENTITY_DB, adminUserRoute.userId)

                if (!deleted) {
                    return errorResponse(404, 'User not found', 'user_not_found')
                }

                return json({
                    ok: true
                })
            }

            const adminLobbyRoute = parseAdminLobbyRoute(url.pathname)

            if (adminLobbyRoute) {
                if (request.method !== 'DELETE') {
                    return methodNotAllowed('DELETE')
                }

                const auth = await requireAdminBasicAuth(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                return getLobbyStub(env, adminLobbyRoute.lobbyId).fetch(
                    new Request('https://lobby.internal/admin/destroy', {
                        method: 'DELETE',
                        headers: {
                            'x-lobby-id': encodeHeaderValue(adminLobbyRoute.lobbyId)
                        }
                    })
                )
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
                        const lobbyId = String(formData.get('lobbyId') || '').trim()
                        const name = String(formData.get('lobbyId') || '').trim()
                        const password = readOptionalFormText(formData, 'password')
                        const gameName = String(formData.get('gameName') || '').trim()

                        if (!lobbyId) {
                            return errorResponse(400, 'Lobby id is required', 'invalid_payload')
                        }

                        const assetStore = createAssetStore(env, request)
                        const stub = getLobbyStub(env, lobbyId)

                        if (gameName === 'Jeopardy') {
                            const packFile = readOptionalFormFile(formData, 'initialData-pack')

                            if (!packFile) {
                                return errorResponse(400, 'Jeopardy pack is required', 'missing_pack')
                            }

                            const packBytes = await packFile.arrayBuffer()
                            let parsedPack: Awaited<ReturnType<typeof parseJeopardyPackArchive>>

                            try {
                                parsedPack = await parseJeopardyPackArchive(packBytes)
                            } catch (error) {
                                return errorResponse(400, error instanceof Error ? error.message : 'Failed to parse Jeopardy pack', 'invalid_pack')
                            }

                            const compatibility = validateJeopardyPackCompatibility(parsedPack.declaration)

                            if (!compatibility.compatible) {
                                return errorResponse(400, compatibility.reason, 'incompatible_pack')
                            }

                            const storedPack = await assetStore.put({
                                body: packBytes,
                                contentType: packFile.type || 'application/octet-stream',
                                fileName: packFile.name,
                                kind: 'jeopardy-pack',
                                ownerId: lobbyId,
                                ownerType: 'lobby',
                                size: packFile.size,
                                uploadedByUserId: auth.session.user.id
                            })

                            return stub.fetch(
                                toLobbyRequest(
                                    new Request(request.url, {
                                        method: 'POST',
                                        headers: {
                                            'content-type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            game: {
                                                kind: 'Jeopardy',
                                                config: {
                                                    pack: {
                                                        public: true,
                                                        value: storedPack.url
                                                    },
                                                    packAssetId: storedPack.id,
                                                    packAuthor: parsedPack.author,
                                                    packDateCreated: parsedPack.dateCreated,
                                                    packDeclaration: parsedPack.declaration,
                                                    packFileName: storedPack.fileName
                                                }
                                            },
                                            name,
                                            password,
                                            lobbyId
                                        } as CreateLobbyRequest)
                                    }),
                                    lobbyId,
                                    '/create',
                                    auth.session
                                )
                            )
                        }

                        if (gameName === 'Clicker') {
                            const backgroundFile = readOptionalFormFile(formData, 'initialData-background')
                            let backgroundUrl: string | undefined

                            if (backgroundFile) {
                                const backgroundBytes = await backgroundFile.arrayBuffer()
                                const storedBackground = await assetStore.put({
                                    body: backgroundBytes,
                                    contentType: backgroundFile.type || 'application/octet-stream',
                                    fileName: backgroundFile.name,
                                    kind: 'clicker-background',
                                    ownerId: lobbyId,
                                    ownerType: 'lobby',
                                    size: backgroundFile.size,
                                    uploadedByUserId: auth.session.user.id
                                })

                                backgroundUrl = storedBackground.url
                            }

                            return stub.fetch(
                                toLobbyRequest(
                                    new Request(request.url, {
                                        method: 'POST',
                                        headers: {
                                            'content-type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            game: {
                                                kind: 'Clicker',
                                                config: backgroundUrl
                                                    ? {
                                                          backgroundUrl
                                                      }
                                                    : {}
                                            },
                                            name,
                                            password,
                                            lobbyId
                                        } as CreateLobbyRequest)
                                    }),
                                    lobbyId,
                                    '/create',
                                    auth.session
                                )
                            )
                        }

                        return errorResponse(400, `Multipart lobby creation is not supported for ${gameName}`, 'invalid_game')
                    }

                    const body = await parseJsonBody<CreateLobbyRequest>(request)

                    if (!body || typeof body.lobbyId !== 'string' || !body.lobbyId.trim()) {
                        return errorResponse(400, 'Lobby id is required', 'invalid_payload')
                    }

                    const gameKind = body?.game?.kind

                    if (!gameKind || !['TicTacToe', 'Clicker', 'Jeopardy'].includes(gameKind)) {
                        return errorResponse(400, `Unsupported game: ${gameKind}`, 'invalid_game')
                    }

                    const lobbyId = body.lobbyId.trim()
                    const stub = getLobbyStub(env, lobbyId)

                    return stub.fetch(
                        toLobbyRequest(
                            new Request(request.url, {
                                method: 'POST',
                                headers: request.headers,
                                body: JSON.stringify({
                                    ...body,
                                    game: {
                                        ...body.game,
                                        kind: gameKind
                                    },
                                    lobbyId
                                })
                            }),
                            lobbyId,
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

                const stub = getLobbyStub(env, lobbyRoute.lobbyId)

                if (lobbyRoute.action === '/destroy') {
                    if (request.method !== 'DELETE') {
                        return methodNotAllowed('DELETE')
                    }

                    return stub.fetch(toLobbyRequest(request, lobbyRoute.lobbyId, '/destroy', auth.session))
                }

                if (request.method !== 'POST') {
                    return methodNotAllowed('POST')
                }

                return stub.fetch(toLobbyRequest(request, lobbyRoute.lobbyId, lobbyRoute.action, auth.session))
            }

            const lobbyHistoryRoute = parseLobbyHistoryRoute(url.pathname)

            if (lobbyHistoryRoute) {
                if (request.method !== 'GET') {
                    return methodNotAllowed('GET')
                }

                const history = await listLobbySessions(env.IDENTITY_DB, lobbyHistoryRoute.lobbyId)

                return json({
                    ok: true,
                    history,
                    lobbyId: lobbyHistoryRoute.lobbyId
                })
            }

            const lobbyStateRoute = parseLobbyRoute(url.pathname)

            if (!lobbyStateRoute) {
                return json(
                    {
                        ok: false,
                        message: `Unknown route: ${url.pathname}`
                    },
                    { status: 404 }
                )
            }

            const stub = getLobbyStub(env, lobbyStateRoute.lobbyId)

            if (lobbyStateRoute.targetPath === '/websocket') {
                const auth = await requireSession(request, env)

                if (!auth.ok) {
                    return auth.error
                }

                return stub.fetch(toLobbyRequest(request, lobbyStateRoute.lobbyId, lobbyStateRoute.targetPath, auth.session))
            }

            if (lobbyStateRoute.targetPath === '/state') {
                const sessionToken = readSessionToken(request)

                if (sessionToken) {
                    const session = await getIdentitySession(env.IDENTITY_DB, sessionToken)

                    if (session) {
                        return stub.fetch(toLobbyRequest(request, lobbyStateRoute.lobbyId, lobbyStateRoute.targetPath, session))
                    }
                }
            }

            return stub.fetch(toLobbyRequest(request, lobbyStateRoute.lobbyId, lobbyStateRoute.targetPath))
        })()

        return withCors(request, response)
    }
}

export default worker
