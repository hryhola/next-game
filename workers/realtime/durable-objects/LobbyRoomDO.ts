import { DurableObject } from 'cloudflare:workers'
import type {
    CreateLobbyRequest,
    LobbyRoomGameActionMessage,
    LobbyRoomClientMessage,
    LobbyRoomServerMessage,
    RealtimeLobbyGameName,
    RealtimeLobbyListItem,
    RealtimeLobbyMemberRole,
    RealtimeLobbySnapshot
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'
import { json } from '../lib/json'
import {
    cancelClickerSessionTasks,
    createAbandonedClickerRoomSessionRecord,
    createCompletedClickerRoomSessionRecord,
    createIdleClickerSession,
    handleClickerAllowClickTask as runClickerAllowClickTask,
    handleClickerClick as handleClickerRoomClick,
    handleClickerCompleteSessionTask as runClickerCompleteSessionTask,
    handleClickerReenablePlayerTask as runClickerReenablePlayerTask,
    startClickerGame as startClickerRoomGame
} from '../lobbies/clicker'
import {
    addChatMessage as addLobbyChatMessage,
    joinRoom as joinLobbyRoom,
    normalizePlayerAssignments as normalizeLobbyPlayerAssignments,
    refreshStoredMember as refreshLobbyMember,
    resetReadyCheck as resetLobbyReadyCheck,
    setReadyState as setLobbyReadyState,
    startReadyCheck as startLobbyReadyCheck,
    tipMember as tipLobbyMember
} from '../lobbies/common'
import { JeopardyRoomFeature } from '../lobbies/jeopardy'
import { markLobbyDeleted, upsertLobbyMetadata } from '../lobbies/store'
import {
    createAbandonedTicTacToeRoomSessionRecord,
    createCompletedTicTacToeRoomSessionRecord,
    createIdleTicTacToeSession as createStoredIdleTicTacToeSession,
    makeTicTacToeMove,
    startTicTacToeGame as startTicTacToeRoomGame
} from '../lobbies/tictactoe'
import { createRoomSession, finalizeRoomSession, type FinalizeRoomSessionInput } from '../room-sessions/store'
import type {
    ComputedLobbySnapshot,
    RoomScheduledTaskPayload,
    RoomSocketAttachment,
    StoredJeopardyGame,
    StoredLobbyMember,
    StoredLobbyState,
    StoredTicTacToeGame
} from '../lobbies/types'
import { RoomScheduler } from '../scheduler/RoomScheduler'
import type { RealtimeWorkerEnv } from '../types'

function nowIso(): string {
    return new Date().toISOString()
}

function readIdentityHeaders(request: Request): RoomSocketAttachment | null {
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

function parseClientMessage(message: string | ArrayBuffer): LobbyRoomClientMessage | null {
    try {
        const textMessage = typeof message === 'string' ? message : new TextDecoder().decode(message)

        return JSON.parse(textMessage) as LobbyRoomClientMessage
    } catch (_error) {
        return null
    }
}

type StartedRoomSession = {
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    startedAt: string
}

type ScheduledTaskResult = {
    action?: LobbyRoomGameActionMessage
    finalizedSession?: FinalizeRoomSessionInput
    stateChanged: boolean
}

type PersistStateOptions = {
    notifyLobbyList?: boolean
}

export class LobbyRoomDO extends DurableObject<RealtimeWorkerEnv> {
    private readonly scheduler: RoomScheduler<RoomScheduledTaskPayload>
    private readonly jeopardy: JeopardyRoomFeature

    constructor(ctx: DurableObjectState, env: RealtimeWorkerEnv) {
        super(ctx, env)

        this.scheduler = new RoomScheduler(ctx.storage)
        this.jeopardy = new JeopardyRoomFeature({
            broadcastServerMessage: message => this.broadcastServerMessage(message),
            createGameActionMessage: payload => this.createGameActionMessage(payload),
            getConnectedSocketsCount: userId => this.ctx.getWebSockets(userTag(userId)).length,
            persistFinalizedRoomSession: session => this.persistFinalizedRoomSession(session),
            scheduler: this.scheduler,
            sendServerMessageToUser: (userId, message) => this.sendServerMessageToUser(userId, message)
        })
        this.ctx.setHibernatableWebSocketEventTimeout(60_000)
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)
        const roomId = request.headers.get('x-room-id') || this.ctx.id.toString()

        if (url.pathname === '/create') {
            return this.handleCreate(request, roomId)
        }

        if (url.pathname === '/destroy') {
            return this.handleDestroy(request, roomId)
        }

        if (url.pathname === '/join') {
            return this.handleJoin(request)
        }

        if (url.pathname === '/leave') {
            return this.handleLeave(request)
        }

        if (url.pathname === '/health') {
            const state = await this.getState()

            if (!state) {
                return json(
                    {
                        ok: false,
                        message: 'Room not found'
                    },
                    { status: 404 }
                )
            }

            return json({
                ok: true,
                roomId: state.roomId,
                createdAt: state.createdAt,
                updatedAt: state.updatedAt,
                members: state.members.length,
                activeConnections: this.ctx.getWebSockets().length,
                gameStatus: state.game.name === 'Jeopardy' ? (state.game.session ? state.game.session.frame.id : 'idle') : state.game.session.status
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
                message: `Unknown LobbyRoomDO route: ${url.pathname}`
            },
            { status: 404 }
        )
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const attachment = ws.deserializeAttachment() as RoomSocketAttachment | null

        if (!attachment) {
            this.sendError(ws, 'Missing socket attachment', 'missing_attachment')
            return
        }

        const request = parseClientMessage(message)

        if (!request) {
            this.sendError(ws, 'Invalid websocket payload', 'invalid_payload')
            return
        }

        if (request.type === 'ping') {
            this.send(ws, { type: 'pong' })
            return
        }

        const state = await this.getState()

        if (!state) {
            this.sendError(ws, 'Room not found', 'room_not_found')
            return
        }

        switch (request.type) {
            case 'room.sync': {
                this.sendSnapshot(ws, state)
                return
            }
            case 'room.join': {
                const joinResult = joinLobbyRoom(state, attachment.user, request.payload.role, request.payload.password)

                if (!joinResult.success) {
                    this.sendError(ws, joinResult.message, joinResult.code)
                    return
                }

                await this.persistState(state, {
                    notifyLobbyList: true
                })
                this.send(ws, {
                    type: 'room.notice',
                    payload: {
                        message: joinResult.message
                    }
                })
                this.broadcastSnapshot(state)
                return
            }
            case 'room.leave': {
                const leaveResult = await this.leaveRoom(state, attachment.user.id)

                if (!leaveResult.success) {
                    this.sendError(ws, leaveResult.message, leaveResult.code)
                    return
                }

                if (leaveResult.destroyed) {
                    this.send(ws, {
                        type: 'room.notice',
                        payload: {
                            message: leaveResult.message
                        }
                    })
                    try {
                        ws.close(1000, 'room left')
                    } catch (_error) {
                        return
                    }
                    return
                }

                await this.persistState(state, {
                    notifyLobbyList: true
                })
                this.send(ws, {
                    type: 'room.notice',
                    payload: {
                        message: leaveResult.message
                    }
                })
                this.broadcastSnapshot(state)
                try {
                    ws.close(1000, 'room left')
                } catch (_error) {
                    return
                }
                return
            }
            case 'room.tip': {
                const tipResult = tipLobbyMember(state, attachment.user.id, request.payload.id, request.payload.toUserId)

                if (!tipResult.success) {
                    this.sendError(ws, tipResult.message, tipResult.code)
                    return
                }

                this.broadcastServerMessage({
                    type: 'room.tip',
                    payload: tipResult.tip
                })
                return
            }
            case 'room.kick': {
                const kickResult = await this.kickMember(state, attachment.user.id, request.payload.userId)

                if (!kickResult.success) {
                    this.sendError(ws, kickResult.message, kickResult.code)
                    return
                }

                await this.persistState(state, {
                    notifyLobbyList: true
                })
                this.broadcastServerMessage({
                    type: 'room.kick',
                    payload: {
                        memberId: kickResult.memberId
                    }
                })
                this.broadcastSnapshot(state)
                this.closeUserSockets(kickResult.memberId, 1008, 'kicked from room')
                return
            }
            case 'chat.send': {
                const chatResult = addLobbyChatMessage(state, attachment.user.id, request.payload.text)

                if (!chatResult.success) {
                    this.sendError(ws, chatResult.message, chatResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
                return
            }
            case 'ready.start': {
                const readyStartResult = startLobbyReadyCheck(state, attachment.user.id)

                if (!readyStartResult.success) {
                    this.sendError(ws, readyStartResult.message, readyStartResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
                return
            }
            case 'ready.set': {
                const readySetResult = setLobbyReadyState(state, attachment.user.id, request.payload.ready)

                if (!readySetResult.success) {
                    this.sendError(ws, readySetResult.message, readySetResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
                return
            }
            case 'game.start': {
                const gameStartResult = await this.startGame(state, attachment.user.id)

                if (!gameStartResult.success) {
                    this.sendError(ws, gameStartResult.message, gameStartResult.code)
                    return
                }

                if (gameStartResult.action) {
                    this.broadcastGameAction(gameStartResult.action)
                }

                if (gameStartResult.stateChanged) {
                    await this.persistState(state, {
                        notifyLobbyList: true
                    })
                }

                if (gameStartResult.startedSession) {
                    await this.persistStartedRoomSession(state, gameStartResult.startedSession)
                }

                this.broadcastSnapshot(state)
                return
            }
            case 'tictactoe.move': {
                const moveResult = makeTicTacToeMove(state, attachment.user.id, request.payload.cell)

                if (!moveResult.success) {
                    this.sendError(ws, moveResult.message, moveResult.code)
                    return
                }

                await this.persistState(state, {
                    notifyLobbyList: Boolean(moveResult.finalizedSession)
                })
                await this.persistFinalizedRoomSession(moveResult.finalizedSession)
                this.broadcastSnapshot(state)
                return
            }
            case 'clicker.click': {
                const clickResult = await handleClickerRoomClick(state, attachment.user.id, request.payload.x, request.payload.y, {
                    createGameActionMessage: payload => this.createGameActionMessage(payload),
                    scheduler: this.scheduler
                })

                if (!clickResult.success) {
                    this.sendError(ws, clickResult.message, clickResult.code)
                    return
                }

                if (clickResult.action) {
                    this.broadcastGameAction(clickResult.action)
                }

                if (clickResult.stateChanged) {
                    await this.persistState(state)
                    this.broadcastSnapshot(state)
                }

                return
            }
            case 'jeopardy.action': {
                const actionResult = await this.jeopardy.handleAction(state, attachment.user.id, request.payload.actionName, request.payload.actionPayload)

                if (!actionResult.success) {
                    this.sendError(ws, actionResult.message, actionResult.code)
                    return
                }

                if (actionResult.action) {
                    if (actionResult.publishToMasterOnly) {
                        const master = this.jeopardy.getMaster(state)

                        if (master) {
                            this.sendServerMessageToUser(master.id, actionResult.action)
                        }
                    } else {
                        this.broadcastGameAction(actionResult.action)
                    }
                }

                if (actionResult.stateChanged) {
                    await this.persistState(state, {
                        notifyLobbyList: false
                    })
                    this.broadcastSnapshot(state)
                }

                return
            }
        }
    }

    async webSocketClose(): Promise<void> {
        const state = await this.getState()

        if (state) {
            this.broadcastSnapshot(state)
        }
    }

    async webSocketError(): Promise<void> {
        const state = await this.getState()

        if (state) {
            this.broadcastSnapshot(state)
        }
    }

    private async handleCreate(request: Request, roomId: string): Promise<Response> {
        if (request.method !== 'POST') {
            return json(
                {
                    ok: false,
                    message: 'Method not allowed'
                },
                { status: 405 }
            )
        }

        const existing = await this.getState()

        if (existing) {
            return json(
                {
                    ok: false,
                    message: `Lobby with id ${roomId} already exists`
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

        if (!payload || !payload.roomId || typeof payload.roomId !== 'string') {
            return json(
                {
                    ok: false,
                    message: 'Invalid create lobby payload'
                },
                { status: 400 }
            )
        }

        if (payload.roomId !== roomId) {
            return json(
                {
                    ok: false,
                    message: 'Room id mismatch'
                },
                { status: 400 }
            )
        }

        const createdAt = nowIso()

        const gameName: RealtimeLobbyGameName = payload.gameName === 'Clicker' ? 'Clicker' : payload.gameName === 'Jeopardy' ? 'Jeopardy' : 'TicTacToe'

        if (gameName === 'Jeopardy' && !payload.initialData?.pack) {
            return json(
                {
                    ok: false,
                    message: 'Jeopardy requires a pack upload'
                },
                { status: 400 }
            )
        }

        const creatorMember: StoredLobbyMember = {
            ...identity.user,
            isCreator: true,
            joinedAt: createdAt,
            playerChar: gameName === 'TicTacToe' ? 'x' : null,
            playerIsClickAllowed: true,
            playerScore: 0,
            ready: null,
            role: 'player'
        }

        const state: StoredLobbyState = {
            chat: [],
            createdAt,
            creatorUserId: identity.user.id,
            game:
                gameName === 'Clicker'
                    ? {
                          initialData: {},
                          name: 'Clicker',
                          session: createIdleClickerSession()
                      }
                    : gameName === 'Jeopardy'
                      ? ({
                            initialData: {
                                pack: {
                                    public: true,
                                    value: payload.initialData!.pack!.value
                                }
                            },
                            name: 'Jeopardy',
                            packAssetId: payload.initialData!.pack!.assetId,
                            packAuthor: payload.initialData!.pack!.author,
                            packDateCreated: payload.initialData!.pack!.dateCreated,
                            packDeclaration: payload.initialData!.pack!.declaration,
                            packFileName: payload.initialData!.pack!.fileName,
                            packName: payload.initialData!.pack!.declaration.package._attributes.name,
                            session: null
                        } as StoredJeopardyGame)
                      : ({
                            name: 'TicTacToe',
                            session: createStoredIdleTicTacToeSession()
                        } as StoredTicTacToeGame),
            members: [creatorMember],
            name: payload.name?.trim() || payload.roomId,
            password: payload.password?.trim() || undefined,
            readyCheck: {
                participants: [],
                status: 'idle',
                updatedAt: null
            },
            roomId,
            updatedAt: createdAt
        }

        await this.persistState(state, {
            notifyLobbyList: true
        })

        return json({
            ok: true,
            room: this.buildSnapshot(state)
        })
    }

    private async handleState(request: Request): Promise<Response> {
        const state = await this.getState()

        if (!state) {
            return json(
                {
                    ok: false,
                    message: 'Room not found'
                },
                { status: 404 }
            )
        }

        const identity = readIdentityHeaders(request)
        const responseBody: Record<string, unknown> = {
            ok: true,
            room: this.buildSnapshot(state)
        }

        if (state.game.name === 'Jeopardy' && state.game.session && identity?.user.id === state.creatorUserId) {
            responseBody.sessionInternal = this.jeopardy.toInternalView(state.game.session.internal)
        }

        return json(responseBody)
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

        const state = await this.getState()

        if (!state) {
            return json(
                {
                    ok: false,
                    message: 'Room not found'
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

        if (!body?.role || !['player', 'spectator'].includes(body.role)) {
            return json(
                {
                    ok: false,
                    message: 'Invalid join role'
                },
                { status: 400 }
            )
        }

        const result = joinLobbyRoom(state, identity.user, body.role, body.password)

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

        await this.persistState(state, {
            notifyLobbyList: true
        })

        return json({
            ok: true,
            room: this.buildSnapshot(state)
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

        const state = await this.getState()

        if (!state) {
            return json(
                {
                    ok: false,
                    message: 'Room not found'
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

        const result = await this.leaveRoom(state, identity.user.id)

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
            return json({
                ok: true,
                destroyed: true
            })
        }

        await this.persistState(state, {
            notifyLobbyList: true
        })

        return json({
            ok: true,
            room: this.buildSnapshot(state)
        })
    }

    private async handleDestroy(request: Request, roomId: string): Promise<Response> {
        const state = await this.getState()

        if (!state) {
            return json(
                {
                    ok: false,
                    message: 'Room not found'
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

        if (state.creatorUserId !== identity.user.id) {
            return json(
                {
                    ok: false,
                    message: 'Only the lobby creator can destroy this room'
                },
                { status: 403 }
            )
        }

        await this.destroyRoom(roomId, state)

        return json({
            ok: true
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

        const state = await this.getState()

        if (!state) {
            return json(
                {
                    ok: false,
                    message: 'Room not found'
                },
                { status: 404 }
            )
        }

        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket]

        server.serializeAttachment(identity)
        this.ctx.acceptWebSocket(server, [userTag(identity.user.id), sessionTag(identity.sessionId)])

        this.sendSnapshot(server, state)

        if (state.game.name === 'Jeopardy' && state.game.session && identity.user.id === state.creatorUserId) {
            server.send(
                JSON.stringify({
                    type: 'game.session.update',
                    payload: {
                        data: {
                            internal: this.jeopardy.toInternalView(state.game.session.internal)
                        }
                    }
                } as LobbyRoomServerMessage)
            )
        }

        this.broadcastSnapshot(state)

        return new Response(null, {
            status: 101,
            webSocket: client
        } as ResponseInit & { webSocket: WebSocket })
    }

    private async getState(): Promise<StoredLobbyState | null> {
        return (await this.ctx.storage.get<StoredLobbyState>('state')) || null
    }

    private async persistState(state: StoredLobbyState, options: PersistStateOptions = {}): Promise<void> {
        state.updatedAt = nowIso()
        await this.ctx.storage.put('state', state)
        await this.syncLobbyMetadata(state)

        if (options.notifyLobbyList) {
            await this.notifyGlobalLobbyListUpdated()
        }
    }

    private async destroyRoom(roomId: string, state?: StoredLobbyState): Promise<void> {
        const deletedAt = nowIso()
        const roomState = state || (await this.getState())

        await this.persistFinalizedRoomSession(roomState ? this.createAbandonedRoomSessionRecord(roomState, 'room_destroyed') : null)

        this.ctx.getWebSockets().forEach(socket => {
            try {
                socket.send(
                    JSON.stringify({
                        type: 'room.notice',
                        payload: {
                            message: 'This room has been destroyed'
                        }
                    } as LobbyRoomServerMessage)
                )
                socket.close(1001, 'room destroyed')
            } catch (_error) {
                return
            }
        })

        await markLobbyDeleted(this.env.IDENTITY_DB, roomId, deletedAt)
        await this.notifyGlobalLobbyListUpdated()
        await this.scheduler.clear()
        await this.ctx.storage.deleteAll()
    }

    private async syncLobbyMetadata(state: StoredLobbyState): Promise<void> {
        const creator = state.members.find(member => member.isCreator)

        if (!creator) {
            return
        }

        const item: RealtimeLobbyListItem = {
            id: state.roomId,
            private: Boolean(state.password),
            createdAt: state.createdAt,
            creatorNickname: creator.userNickname,
            creatorUserId: creator.id,
            gameName: state.game.name,
            membersCount: state.members.length,
            name: state.name,
            playersCount: state.members.filter(member => member.role === 'player').length,
            status:
                state.game.name === 'Clicker'
                    ? state.game.session.status === 'idle'
                        ? 'waiting'
                        : 'in_progress'
                    : state.game.name === 'Jeopardy'
                      ? state.game.session
                          ? 'in_progress'
                          : 'waiting'
                      : state.game.session.status === 'active'
                        ? 'in_progress'
                        : 'waiting',
            updatedAt: state.updatedAt
        }

        await upsertLobbyMetadata(this.env.IDENTITY_DB, item)
    }

    private buildSnapshot(state: StoredLobbyState): ComputedLobbySnapshot {
        const game =
            state.game.name === 'Clicker'
                ? {
                      initialData: {
                          ...state.game.initialData
                      },
                      name: 'Clicker' as const,
                      session: {
                          ...state.game.session
                      }
                  }
                : state.game.name === 'Jeopardy'
                  ? {
                        initialData: {
                            ...state.game.initialData
                        },
                        name: 'Jeopardy' as const,
                        session: state.game.session ? this.jeopardy.toPublicSession(state.game.session) : null
                    }
                  : {
                        name: 'TicTacToe' as const,
                        session: {
                            ...state.game.session,
                            board: state.game.session.board.map(row => [...row]),
                            winLine: state.game.session.winLine ? [...state.game.session.winLine] : null
                        }
                    }

        return {
            chat: [...state.chat],
            createdAt: state.createdAt,
            creatorUserId: state.creatorUserId,
            game,
            hasPassword: Boolean(state.password),
            members: state.members
                .map(member => ({
                    ...member,
                    connected: this.ctx.getWebSockets(userTag(member.id)).length > 0,
                    playerChar: member.playerChar || undefined,
                    playerIsClickAllowed: member.role === 'player' && state.game.name === 'Clicker' ? member.playerIsClickAllowed : undefined,
                    playerIsMaster: member.role === 'player' ? member.isCreator : undefined,
                    playerScore: member.role === 'player' ? member.playerScore : undefined
                }))
                .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
            name: state.name,
            readyCheck: {
                ...state.readyCheck,
                participants: [...state.readyCheck.participants]
            },
            roomId: state.roomId,
            updatedAt: state.updatedAt
        }
    }

    private sendSnapshot(ws: WebSocket, state: StoredLobbyState): void {
        this.send(ws, {
            type: 'room.snapshot',
            payload: this.buildSnapshot(state)
        })
    }

    private broadcastSnapshot(state: StoredLobbyState): void {
        this.broadcastServerMessage({
            type: 'room.snapshot',
            payload: this.buildSnapshot(state)
        })
    }

    private broadcastGameAction(message: LobbyRoomGameActionMessage): void {
        this.broadcastServerMessage(message)
    }

    private sendServerMessageToUser(userId: string, message: LobbyRoomServerMessage): void {
        const payload = JSON.stringify(message)

        this.ctx.getWebSockets(userTag(userId)).forEach(socket => {
            try {
                socket.send(payload)
            } catch (_error) {
                try {
                    socket.close(1011, 'targeted message failed')
                } catch (_nestedError) {
                    return
                }
            }
        })
    }

    private broadcastServerMessage(message: LobbyRoomServerMessage): void {
        const payload = JSON.stringify(message)

        this.ctx.getWebSockets().forEach(socket => {
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

    private sendError(ws: WebSocket, message: string, code?: string): void {
        this.send(ws, {
            type: 'room.error',
            payload: {
                code,
                message
            }
        })
    }

    private send(ws: WebSocket, message: LobbyRoomServerMessage): void {
        ws.send(JSON.stringify(message))
    }

    private async leaveRoom(
        state: StoredLobbyState,
        userId: string
    ): Promise<{ success: true; message: string; destroyed?: boolean } | { success: false; message: string; code: string }> {
        const member = state.members.find(item => item.id === userId)

        if (!member) {
            return {
                success: false,
                message: 'You are not in this room',
                code: 'not_in_room'
            }
        }

        state.members = state.members.filter(item => item.id !== userId)

        if (!state.members.length) {
            await this.destroyRoom(state.roomId, state)
            return {
                success: true,
                message: 'Room closed because the last member left',
                destroyed: true
            }
        }

        if (member.isCreator) {
            state.members
                .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
                .forEach((item, index) => {
                    item.isCreator = index === 0
                })

            state.creatorUserId = state.members.find(item => item.isCreator)!.id
        }

        if (member.role === 'player') {
            await this.handleRemovedPlayerSideEffects(state, 'player_left')
        }

        normalizeLobbyPlayerAssignments(state)
        resetLobbyReadyCheck(state)

        return {
            success: true,
            message: `${member.userNickname} left the room`
        }
    }

    private async kickMember(
        state: StoredLobbyState,
        actorUserId: string,
        targetUserId: string
    ): Promise<{ success: true; memberId: string } | { success: false; message: string; code: string }> {
        if (state.creatorUserId !== actorUserId) {
            return {
                success: false,
                message: 'Only the lobby creator can kick players',
                code: 'forbidden'
            }
        }

        const member = state.members.find(item => item.id === targetUserId)

        if (!member) {
            return {
                success: false,
                message: 'Member not found',
                code: 'member_not_found'
            }
        }

        if (member.isCreator) {
            return {
                success: false,
                message: 'The lobby creator cannot be kicked',
                code: 'cannot_kick_creator'
            }
        }

        state.members = state.members.filter(item => item.id !== targetUserId)

        if (member.role === 'player') {
            await this.handleRemovedPlayerSideEffects(state, 'player_kicked')
        }

        normalizeLobbyPlayerAssignments(state)
        resetLobbyReadyCheck(state)

        return {
            success: true,
            memberId: member.id
        }
    }

    private async startGame(
        state: StoredLobbyState,
        userId: string
    ): Promise<
        | {
              success: true
              action?: LobbyRoomGameActionMessage
              startedSession?: StartedRoomSession
              stateChanged: boolean
          }
        | {
              success: false
              code: string
              message: string
          }
    > {
        if (state.game.name === 'Clicker') {
            return startClickerRoomGame(state, userId, {
                createGameActionMessage: payload => this.createGameActionMessage(payload),
                scheduler: this.scheduler
            })
        }

        if (state.game.name === 'Jeopardy') {
            return this.jeopardy.startGame(state, userId)
        }

        return startTicTacToeRoomGame(state, userId)
    }

    async alarm(): Promise<void> {
        const dueTasks = await this.scheduler.peekDue()

        if (!dueTasks.length) {
            return
        }

        const state = await this.getState()

        if (!state) {
            await this.scheduler.complete(dueTasks.map(task => task.key))
            return
        }

        const completedKeys: string[] = []
        const finalizedSessions: FinalizeRoomSessionInput[] = []
        const gameActions: LobbyRoomGameActionMessage[] = []
        let stateChanged = false

        for (const task of dueTasks) {
            const taskResult = await this.runScheduledTask(state, task.payload)

            completedKeys.push(task.key)
            stateChanged = stateChanged || taskResult.stateChanged

            if (taskResult.action) {
                gameActions.push(taskResult.action)
            }

            if (taskResult.finalizedSession) {
                finalizedSessions.push(taskResult.finalizedSession)
            }
        }

        if (stateChanged) {
            await this.persistState(state, {
                notifyLobbyList: finalizedSessions.length > 0
            })
        }

        await this.scheduler.complete(completedKeys)
        await Promise.all(finalizedSessions.map(session => this.persistFinalizedRoomSession(session)))

        gameActions.forEach(action => this.broadcastGameAction(action))

        if (stateChanged) {
            this.broadcastSnapshot(state)
        }
    }

    private async runScheduledTask(state: StoredLobbyState, task: RoomScheduledTaskPayload): Promise<ScheduledTaskResult> {
        switch (task.type) {
            case 'clicker.allow-click':
                return runClickerAllowClickTask(state, task.sessionId, {
                    createGameActionMessage: payload => this.createGameActionMessage(payload),
                    scheduler: this.scheduler
                })
            case 'clicker.reenable-player':
                return runClickerReenablePlayerTask(state, task.sessionId, task.userId)
            case 'clicker.complete-session':
                return runClickerCompleteSessionTask(state, task.sessionId, task.winnerUserId)
            case 'jeopardy.pack-preview.complete':
            case 'jeopardy.round-preview.theme':
            case 'jeopardy.round-preview.complete':
            case 'jeopardy.pick-question.complete':
            case 'jeopardy.question.atom.complete':
            case 'jeopardy.answer-request.complete':
            case 'jeopardy.answer-giving.complete':
            case 'jeopardy.answer-verifying.complete':
            case 'jeopardy.cooldown.complete':
                return this.jeopardy.handleTask(state, task)
        }
    }

    private createGameActionMessage(message: LobbyRoomGameActionMessage['payload']): LobbyRoomGameActionMessage {
        return {
            type: 'game.action',
            payload: message
        }
    }

    private async handleRemovedPlayerSideEffects(state: StoredLobbyState, removalReason: 'player_kicked' | 'player_left'): Promise<void> {
        if (state.game.name === 'TicTacToe' && state.game.session.status === 'active') {
            await this.persistFinalizedRoomSession(createAbandonedTicTacToeRoomSessionRecord(state, removalReason))
            state.game.session = createStoredIdleTicTacToeSession()
            return
        }

        if (state.game.name === 'Jeopardy' && state.game.session) {
            await this.jeopardy.handlePlayerRemoved(state, removalReason)
            return
        }

        if (state.game.name !== 'Clicker' || state.game.session.status === 'idle') {
            return
        }

        const activePlayersLeft = state.members.some(item => item.role === 'player')

        if (!activePlayersLeft) {
            const sessionId = state.game.session.id
            const abandonedSession = createAbandonedClickerRoomSessionRecord(
                state,
                removalReason === 'player_kicked' ? 'all_players_kicked' : 'all_players_left'
            )

            state.game.session = createIdleClickerSession()

            if (sessionId) {
                await cancelClickerSessionTasks(this.scheduler, sessionId)
            }

            await this.persistFinalizedRoomSession(abandonedSession)
        }
    }

    private closeUserSockets(userId: string, code: number, reason: string): void {
        this.ctx.getWebSockets(userTag(userId)).forEach(socket => {
            try {
                socket.close(code, reason)
            } catch (_error) {
                return
            }
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

    private async persistStartedRoomSession(state: StoredLobbyState, session: StartedRoomSession): Promise<void> {
        try {
            await createRoomSession(this.env.IDENTITY_DB, {
                gameName: session.gameName,
                id: session.id,
                initiatedByUserId: session.initiatedByUserId,
                roomId: state.roomId,
                roomName: state.name,
                startedAt: session.startedAt
            })
        } catch (error) {
            console.error('Failed to persist room session start', error)
        }
    }

    private async persistFinalizedRoomSession(session: FinalizeRoomSessionInput | null | undefined): Promise<void> {
        if (!session) {
            return
        }

        try {
            await finalizeRoomSession(this.env.IDENTITY_DB, session)
        } catch (error) {
            console.error('Failed to persist room session finalization', error)
        }
    }

    private createAbandonedRoomSessionRecord(state: StoredLobbyState, reason: string): FinalizeRoomSessionInput | null {
        if (state.game.name === 'TicTacToe') {
            return createAbandonedTicTacToeRoomSessionRecord(state, reason)
        }

        if (state.game.name === 'Jeopardy') {
            return this.jeopardy.createAbandonedRoomSessionRecord(state, reason)
        }

        return createAbandonedClickerRoomSessionRecord(state, reason)
    }
}
