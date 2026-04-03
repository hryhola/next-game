import { DurableObject } from 'cloudflare:workers'
import type {
    CreateLobbyRequest,
    LobbyClientMessage,
    LobbyGameActionMessage,
    LobbyServerMessage,
    RealtimeLobbyMemberRole
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'
import { decodeHeaderValue } from '../lib/headerEncoding'
import { json } from '../lib/json'
import { markLobbyDeleted, upsertLobbyMetadata } from '../lobbies/store'
import { LobbyScheduler } from '../scheduler/LobbyScheduler'
import type { RealtimeWorkerEnv } from '../types'
import { LobbyAggregate, type CreateLobbyRecordInput } from '../lobby/aggregate'
import { LobbyGameRegistry } from '../lobby/registry'
import { LobbyRepository } from '../lobby/repository'
import { LobbySessionHistoryReporter } from '../lobby/session-history'
import type { LobbyRecordV2, LobbyScheduledTaskPayload, LobbySocketAttachment } from '../lobby/types'
import type { LobbyMutationSuccess } from '../lobby/operations'

function readIdentityHeaders(request: Request): LobbySocketAttachment | null {
    const sessionId = request.headers.get('x-session-id')
    const userId = request.headers.get('x-user-id')
    const userNickname = decodeHeaderValue(request.headers.get('x-user-nickname'))
    const userColor = decodeHeaderValue(request.headers.get('x-user-color'))
    const userAvatarUrl = decodeHeaderValue(request.headers.get('x-user-avatar-url'))

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
        sessionId,
        user
    }
}

function userTag(userId: string): string {
    return `user:${userId}`
}

function sessionTag(sessionId: string): string {
    return `session:${sessionId}`
}

function parseClientMessage(message: string | ArrayBuffer): LobbyClientMessage | null {
    try {
        const textMessage = typeof message === 'string' ? message : new TextDecoder().decode(message)

        return JSON.parse(textMessage) as LobbyClientMessage
    } catch (_error) {
        return null
    }
}

function toCreateLobbyRecordInput(payload: CreateLobbyRequest): CreateLobbyRecordInput {
    return {
        lobbyId: payload.lobbyId,
        name: payload.name,
        password: payload.password,
        game: {
            kind: payload.game.kind,
            config: payload.game.config
        }
    }
}

export class LobbyDO extends DurableObject<RealtimeWorkerEnv> {
    private readonly repository: LobbyRepository
    private readonly scheduler: LobbyScheduler<LobbyScheduledTaskPayload>
    private readonly sessionHistory: LobbySessionHistoryReporter

    constructor(ctx: DurableObjectState, env: RealtimeWorkerEnv) {
        super(ctx, env)

        this.repository = new LobbyRepository(ctx.storage)
        this.scheduler = new LobbyScheduler(ctx.storage)
        this.sessionHistory = new LobbySessionHistoryReporter(env)
        this.ctx.setHibernatableWebSocketEventTimeout(60_000)
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)
        const lobbyId = decodeHeaderValue(request.headers.get('x-lobby-id')) || this.ctx.id.toString()

        if (url.pathname === '/create') {
            return this.handleCreate(request, lobbyId)
        }

        if (url.pathname === '/destroy') {
            return this.handleDestroy(request, lobbyId)
        }

        if (url.pathname === '/admin/destroy') {
            return this.handleAdminDestroy(request, lobbyId)
        }

        if (url.pathname === '/join') {
            return this.handleJoin(request)
        }

        if (url.pathname === '/leave') {
            return this.handleLeave(request)
        }

        if (url.pathname === '/admin/remove-member') {
            return this.handleAdminRemoveMember(request)
        }

        if (url.pathname === '/health') {
            const record = await this.repository.get()

            if (!record) {
                return json(
                    {
                        ok: false,
                        message: 'Lobby not found'
                    },
                    { status: 404 }
                )
            }

            const aggregate = this.createAggregate(record)

            return json({
                ok: true,
                lobbyId: record.lobby.id,
                createdAt: record.lobby.createdAt,
                updatedAt: record.lobby.updatedAt,
                members: record.members.length,
                activeConnections: this.getOpenSockets().length,
                onlineUsers: this.getOnlineUserCount(),
                gameStatus: aggregate.buildLobbyListItem().status
            })
        }

        if (url.pathname === '/state') {
            return this.handleState(request)
        }

        if (url.pathname === '/websocket') {
            return this.handleWebSocket(request)
        }

        return json(
            {
                ok: false,
                message: `Unknown LobbyDO route: ${url.pathname}`
            },
            { status: 404 }
        )
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const attachment = ws.deserializeAttachment() as LobbySocketAttachment | null

        if (!attachment) {
            this.sendError(ws, 'Missing socket attachment', 'missing_attachment')
            return
        }

        const parsedRequest = parseClientMessage(message)

        if (!parsedRequest) {
            this.sendError(ws, 'Invalid websocket payload', 'invalid_payload')
            return
        }

        if (parsedRequest.type === 'ping') {
            this.send(ws, { type: 'pong' })
            return
        }

        const record = await this.repository.get()

        if (!record) {
            this.sendError(ws, 'Lobby not found', 'lobby_not_found')
            return
        }

        const aggregate = this.createAggregate(record)

        if (parsedRequest.type === 'lobby.sync') {
            this.sendState(ws, aggregate)
            return
        }

        const result =
            parsedRequest.type === 'lobby.command'
                ? await aggregate.handleLobbyCommand(attachment.user, parsedRequest.payload.commandName, parsedRequest.payload.commandPayload)
                : await aggregate.handleGameCommand(attachment.user.id, parsedRequest.payload.commandName, parsedRequest.payload.commandPayload)

        if (!result.success) {
            this.sendError(ws, result.message, result.code)
            return
        }

        if (result.destroyed) {
            await this.destroyRoom(record.lobby.id, aggregate.getRecord(), 'lobby_destroyed')
            this.send(ws, {
                type: 'lobby.notice',
                payload: {
                    message: result.message || 'This lobby has been destroyed'
                }
            })
            try {
                ws.close(1000, 'lobby closed')
            } catch (_error) {
                return
            }
            return
        }

        await this.applyMutationResult(aggregate, result)
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
        try {
            ws.close(code, reason)
        } catch (_error) {
            // Ignore sockets that are already closing or closed.
        }

        const record = await this.repository.get()

        if (record) {
            this.broadcastState(this.createAggregate(record))
        }
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        try {
            ws.close(1011, 'socket error')
        } catch (_error) {
            // Ignore sockets that are already closing or closed.
        }

        const record = await this.repository.get()

        if (record) {
            this.broadcastState(this.createAggregate(record))
        }
    }

    async alarm(): Promise<void> {
        const dueTasks = await this.scheduler.peekDue()

        if (!dueTasks.length) {
            return
        }

        const record = await this.repository.get()

        if (!record) {
            await this.scheduler.complete(dueTasks.map(task => task.key))
            return
        }

        const aggregate = this.createAggregate(record)
        const completedKeys: string[] = []
        let notifyLobbyList = false
        let stateChanged = false

        for (const task of dueTasks) {
            const result = await aggregate.handleTask(task.payload)

            completedKeys.push(task.key)

            if (!result.success) {
                continue
            }

            stateChanged = stateChanged || result.stateChanged
            notifyLobbyList = notifyLobbyList || Boolean(result.notifyLobbyList)

            if (result.startedSession) {
                await this.sessionHistory.persistStarted(aggregate.getRecord(), result.startedSession)
            }

            if (result.finalizedSession) {
                await this.sessionHistory.persistFinalized(result.finalizedSession)
            }

            if (result.lobbyEvent) {
                this.broadcastServerMessage({
                    type: 'lobby.event',
                    payload: result.lobbyEvent
                })
            }

            if (result.gameEvent) {
                this.broadcastGameEvent(result.gameEvent)
            }
        }

        if (stateChanged) {
            await this.persistRecord(aggregate.getRecord(), notifyLobbyList)
            this.broadcastState(aggregate)
        }

        await this.scheduler.complete(completedKeys)
    }

    private async handleCreate(request: Request, lobbyId: string): Promise<Response> {
        if (request.method !== 'POST') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const existing = await this.repository.get()

        if (existing) {
            return json(
                {
                    ok: false,
                    message: `Lobby with id ${lobbyId} already exists`
                },
                { status: 409 }
            )
        }

        const identity = readIdentityHeaders(request)

        if (!identity) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated creator headers'
                },
                { status: 400 }
            )
        }

        let payload: CreateLobbyRequest | null = null

        try {
            payload = (await request.json()) as CreateLobbyRequest
        } catch (_error) {
            payload = null
        }

        if (!payload || !payload.lobbyId || typeof payload.lobbyId !== 'string') {
            return json(
                {
                    ok: false,
                    message: 'Invalid create lobby payload'
                },
                { status: 400 }
            )
        }

        if (payload.lobbyId !== lobbyId) {
            return json(
                {
                    ok: false,
                    message: 'Lobby id mismatch'
                },
                { status: 400 }
            )
        }

        const createInput = toCreateLobbyRecordInput(payload)

        if (createInput.game.kind === 'Jeopardy' && !(createInput.game.config as Record<string, unknown>).packDeclaration) {
            return json(
                {
                    ok: false,
                    message: 'Jeopardy requires a pack upload'
                },
                { status: 400 }
            )
        }

        const record = LobbyAggregate.create(createInput, identity.user, this.createRegistry())
        await this.persistRecord(record, true)

        return json({
            ok: true,
            lobby: this.createAggregate(record).buildState(identity.user.id)
        })
    }

    private async handleDestroy(request: Request, lobbyId: string): Promise<Response> {
        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        const identity = readIdentityHeaders(request)

        if (!identity) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated user headers'
                },
                { status: 400 }
            )
        }

        if (record.lobby.creatorUserId !== identity.user.id) {
            return json(
                {
                    ok: false,
                    message: 'Only the lobby creator can destroy this room'
                },
                { status: 403 }
            )
        }

        await this.destroyRoom(lobbyId, record, 'lobby_destroyed')

        return json({
            ok: true
        })
    }

    private async handleAdminDestroy(request: Request, lobbyId: string): Promise<Response> {
        if (request.method !== 'DELETE') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        await this.destroyRoom(lobbyId, record, 'admin_destroyed')

        return json({
            ok: true
        })
    }

    private async handleJoin(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        const identity = readIdentityHeaders(request)

        if (!identity) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated join headers'
                },
                { status: 400 }
            )
        }

        const body = (await request.json().catch(() => null)) as { password?: string; role?: RealtimeLobbyMemberRole } | null
        const aggregate = this.createAggregate(record)
        const result = await aggregate.handleLobbyCommand(identity.user, 'join', body)

        if (!result.success) {
            return json(
                {
                    ok: false,
                    message: result.message,
                    code: result.code
                },
                { status: result.code === 'player_slots_full' ? 409 : 400 }
            )
        }

        await this.applyMutationResult(aggregate, result)

        return json({
            ok: true,
            lobby: aggregate.buildState(identity.user.id)
        })
    }

    private async handleLeave(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        const identity = readIdentityHeaders(request)

        if (!identity) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated leave headers'
                },
                { status: 400 }
            )
        }

        const aggregate = this.createAggregate(record)
        const result = await aggregate.handleLobbyCommand(identity.user, 'leave', null)

        if (!result.success) {
            return json(
                {
                    ok: false,
                    message: result.message,
                    code: result.code
                },
                { status: 400 }
            )
        }

        if (result.destroyed) {
            await this.destroyRoom(record.lobby.id, aggregate.getRecord(), 'room_empty')

            return json({
                ok: true,
                destroyed: true
            })
        }

        await this.applyMutationResult(aggregate, result)

        return json({
            ok: true,
            lobby: aggregate.buildState(identity.user.id)
        })
    }

    private async handleAdminRemoveMember(request: Request): Promise<Response> {
        if (request.method !== 'POST') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        const body = (await request.json().catch(() => null)) as { userId?: string } | null
        const userId = body?.userId?.trim()

        if (!userId) {
            return json(
                {
                    ok: false,
                    message: 'User id is required'
                },
                { status: 400 }
            )
        }

        const aggregate = this.createAggregate(record)
        const result = await aggregate.handleLobbyCommand(
            {
                id: userId,
                userColor: '#ffffff',
                userNickname: userId
            },
            'leave',
            null
        )

        if (!result.success) {
            if (result.code === 'not_in_room') {
                return json({
                    ok: true,
                    removed: false
                })
            }

            return json(
                {
                    ok: false,
                    message: result.message,
                    code: result.code
                },
                { status: 400 }
            )
        }

        if (result.destroyed) {
            await this.destroyRoom(record.lobby.id, aggregate.getRecord(), 'admin_member_removed')

            return json({
                ok: true,
                destroyed: true,
                removed: true
            })
        }

        await this.applyMutationResult(aggregate, result)
        this.closeUserSockets(userId, 1008, 'removed by admin')

        return json({
            ok: true,
            removed: true
        })
    }

    private async handleState(request: Request): Promise<Response> {
        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        const identity = readIdentityHeaders(request)
        const aggregate = this.createAggregate(record)

        const didSyncMemberProfile = await this.syncMemberProfileIfNeeded(aggregate, identity?.user)

        if (didSyncMemberProfile) {
            this.broadcastState(aggregate)
        }

        return json({
            ok: true,
            lobby: aggregate.buildState(identity?.user.id)
        })
    }

    private async handleWebSocket(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Expected Upgrade: websocket', { status: 426 })
        }

        const identity = readIdentityHeaders(request)

        if (!identity) {
            return json(
                {
                    ok: false,
                    message: 'Missing authenticated websocket headers'
                },
                { status: 400 }
            )
        }

        const record = await this.repository.get()

        if (!record) {
            return json(
                {
                    ok: false,
                    message: 'Lobby not found'
                },
                { status: 404 }
            )
        }

        const aggregate = this.createAggregate(record)

        await this.syncMemberProfileIfNeeded(aggregate, identity.user)

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

        server.serializeAttachment(identity)
        this.ctx.acceptWebSocket(server, [userTag(identity.user.id), sessionTag(identity.sessionId)])

        this.sendState(server, aggregate)
        this.broadcastState(aggregate)

        return new Response(null, {
            status: 101,
            webSocket: client
        } as ResponseInit & { webSocket: WebSocket })
    }

    private async applyMutationResult(aggregate: LobbyAggregate, result: LobbyMutationSuccess): Promise<void> {
        if (result.startedSession) {
            await this.sessionHistory.persistStarted(aggregate.getRecord(), result.startedSession)
        }

        if (result.finalizedSession) {
            await this.sessionHistory.persistFinalized(result.finalizedSession)
        }

        if (result.stateChanged) {
            await this.persistRecord(aggregate.getRecord(), Boolean(result.notifyLobbyList))
        }

        if (result.lobbyEvent) {
            this.broadcastServerMessage({
                type: 'lobby.event',
                payload: result.lobbyEvent
            })

            if (result.lobbyEvent.eventName === 'kick') {
                this.closeUserSockets(result.lobbyEvent.eventPayload.memberId, 1008, 'kicked from lobby')
            }
        }

        if (result.gameEvent) {
            this.broadcastGameEvent(result.gameEvent)
        }

        if (result.stateChanged) {
            this.broadcastState(aggregate)
        }
    }

    private async destroyRoom(lobbyId: string, record: LobbyRecordV2, reason: string): Promise<void> {
        const aggregate = this.createAggregate(record)
        await this.sessionHistory.persistFinalized(aggregate.createSessionRecord(reason))

        this.getOpenSockets().forEach(socket => {
            try {
                socket.send(
                    JSON.stringify({
                        type: 'lobby.notice',
                        payload: {
                            message: 'This lobby has been destroyed'
                        }
                    } as LobbyServerMessage)
                )
                socket.close(1001, 'lobby destroyed')
            } catch (_error) {
                return
            }
        })

        await markLobbyDeleted(this.env.IDENTITY_DB, lobbyId, new Date().toISOString())
        await this.notifyGlobalLobbyListUpdated()
        await this.scheduler.clear()
        await this.repository.deleteAll()
    }

    private broadcastGameEvent(message: LobbyGameActionMessage): void {
        this.broadcastServerMessage({
            ...message,
            type: 'game.event'
        })
    }

    private broadcastServerMessage(message: LobbyServerMessage): void {
        const payload = JSON.stringify(message)

        this.getOpenSockets().forEach(socket => {
            try {
                socket.send(payload)
            } catch (_error) {
                try {
                    socket.close(1011, 'broadcast failed')
                } catch (_nestedError) {
                    return
                }
            }
        })
    }

    private broadcastState(aggregate: LobbyAggregate): void {
        this.getOpenSockets().forEach(socket => {
            this.sendState(socket, aggregate)
        })
    }

    private closeUserSockets(userId: string, code: number, reason: string): void {
        this.getOpenSockets(userTag(userId)).forEach(socket => {
            try {
                socket.close(code, reason)
            } catch (_error) {
                return
            }
        })
    }

    private getOpenSockets(tag?: string): WebSocket[] {
        return this.ctx.getWebSockets(tag).filter(socket => socket.readyState === WebSocket.OPEN)
    }

    private getOnlineUserCount(): number {
        const onlineUsers = new Set<string>()

        this.getOpenSockets().forEach(socket => {
            const attachment = socket.deserializeAttachment() as LobbySocketAttachment | null

            if (attachment?.user.id) {
                onlineUsers.add(attachment.user.id)
            }
        })

        return onlineUsers.size
    }

    private createAggregate(record: LobbyRecordV2): LobbyAggregate {
        return new LobbyAggregate(record, this.createRegistry(), {
            createGameActionMessage: payload => ({
                type: 'game.event',
                payload
            }),
            getConnectedSocketsCount: userId => this.getOpenSockets(userTag(userId)).length,
            persistFinalizedLobbySession: session => this.sessionHistory.persistFinalized(session),
            scheduler: this.scheduler
        })
    }

    private createRegistry(): LobbyGameRegistry {
        return new LobbyGameRegistry({
            createGameActionMessage: payload => ({
                type: 'game.event',
                payload
            }),
            getConnectedSocketsCount: userId => this.getOpenSockets(userTag(userId)).length,
            persistFinalizedLobbySession: session => this.sessionHistory.persistFinalized(session),
            scheduler: this.scheduler
        })
    }

    private async notifyGlobalLobbyListUpdated(): Promise<void> {
        try {
            const id = this.env.GLOBAL_PRESENCE.idFromName('global')
            const stub = this.env.GLOBAL_PRESENCE.get(id)

            await stub.fetch(
                new Request('https://presence.internal/events/lobbies-updated', {
                    method: 'POST'
                })
            )
        } catch (error) {
            console.error('Failed to notify global lobby list update', error)
        }
    }

    private async persistRecord(record: LobbyRecordV2, notifyLobbyList: boolean): Promise<void> {
        await this.repository.put(record)
        await this.syncLobbyMetadata(this.createAggregate(record))

        if (notifyLobbyList) {
            await this.notifyGlobalLobbyListUpdated()
        }
    }

    private send(ws: WebSocket, message: LobbyServerMessage): void {
        ws.send(JSON.stringify(message))
    }

    private sendError(ws: WebSocket, message: string, code?: string): void {
        this.send(ws, {
            type: 'lobby.error',
            payload: {
                code,
                message
            }
        })
    }

    private sendState(ws: WebSocket, aggregate: LobbyAggregate): void {
        const attachment = ws.deserializeAttachment() as LobbySocketAttachment | null

        this.send(ws, {
            type: 'lobby.state',
            payload: aggregate.buildState(attachment?.user.id)
        })
    }

    private async syncMemberProfileIfNeeded(aggregate: LobbyAggregate, user?: IdentityProfile): Promise<boolean> {
        if (!user || !aggregate.syncMemberProfile(user)) {
            return false
        }

        const record = aggregate.getRecord()
        const shouldNotifyLobbyList = record.lobby.creatorUserId === user.id

        await this.persistRecord(record, shouldNotifyLobbyList)

        return true
    }

    private async syncLobbyMetadata(aggregate: LobbyAggregate): Promise<void> {
        await upsertLobbyMetadata(this.env.IDENTITY_DB, aggregate.buildLobbyListItem())
    }
}
