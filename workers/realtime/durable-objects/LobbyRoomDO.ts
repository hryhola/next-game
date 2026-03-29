import { DurableObject } from 'cloudflare:workers'
import type {
    CreateLobbyRequest,
    LobbyRoomGameActionMessage,
    LobbyRoomClientMessage,
    LobbyRoomServerMessage,
    RealtimeLobbyGameName,
    RealtimeLobbyListItem,
    RealtimeLobbyMemberRole,
    RealtimeLobbySnapshot,
    RealtimeTicTacToeSession
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'
import type {
    JeopardyDeclaration,
    RealtimeJeopardyPublicSession,
    RealtimeJeopardyQuestionId,
    RealtimeJeopardySessionInternal,
    RealtimeJeopardySessionState,
    RealtimeJeopardyState,
    RealtimeJeopardyWinner
} from '../../../shared/contracts/jeopardy'
import { json } from '../lib/json'
import {
    getAnswers as getJeopardyAnswers,
    getFinalThemes,
    getNonFinalThemes,
    getQuestionById as getJeopardyQuestionById,
    getQuestionScenarioById,
    getRoundQuestionViewData,
    getRoundQuestions,
    getRoundThemeNames,
    getRoundThemesCount,
    getRoundsCount,
    isFinalRound
} from '../jeopardy/pack'
import { CLICKER_COMPLETE_DELAY_MS, CLICKER_REENABLE_DELAY_MS, createIdleClickerSession, getRandomClickerAllowDelayMs } from '../lobbies/clicker'
import { markLobbyDeleted, upsertLobbyMetadata } from '../lobbies/store'
import { createEmptyBoard, findWinningLine, isBoardFull } from '../lobbies/tictactoe'
import { createRoomSession, finalizeRoomSession, type FinalizeRoomSessionInput } from '../room-sessions/store'
import type {
    ComputedLobbySnapshot,
    RoomScheduledTaskPayload,
    RoomSocketAttachment,
    StoredJeopardyGame,
    StoredJeopardyQuestionFlow,
    StoredJeopardySession,
    StoredLobbyMember,
    StoredLobbyState,
    StoredTicTacToeGame
} from '../lobbies/types'
import { RoomScheduler } from '../scheduler/RoomScheduler'
import type { RealtimeWorkerEnv } from '../types'
import { shuffle } from '../../../util/array'

const JEOPARDY_PACK_PREVIEW_DURATION_MS = 10_000
const JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS = 2_000
const JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS = 2_000
const JEOPARDY_PICK_QUESTION_DELAY_MS = 1_000
const JEOPARDY_CONTENT_DEFAULT_DURATION_MS = 5_000
const JEOPARDY_ANSWER_REQUEST_DURATION_MS = 5_000
const JEOPARDY_ANSWER_GIVING_DURATION_MS = 10_000
const JEOPARDY_ANSWER_VERIFYING_DURATION_MS = 10_000
const JEOPARDY_ANSWER_COOLDOWN_MS = 2_000

function nowIso(): string {
    return new Date().toISOString()
}

function createIdleTicTacToeSession(): RealtimeTicTacToeSession {
    return {
        board: createEmptyBoard(),
        endedAt: null,
        id: null,
        isDraw: false,
        startedAt: null,
        status: 'idle' as const,
        turnUserId: null,
        winLine: null,
        winnerUserId: null
    }
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

type JeopardyActionResult =
    | {
          action?: LobbyRoomGameActionMessage
          publishToMasterOnly?: boolean
          stateChanged: boolean
          success: true
      }
    | {
          code: string
          message: string
          success: false
      }

function createEmptyJeopardySessionInternal(): RealtimeJeopardySessionInternal {
    return {
        answeredQuestions: [],
        currentAnsweringPlayerId: null,
        currentRoundId: 0,
        finalAnswers: {},
        finalBets: {},
        pickerId: null
    }
}

function createEmptyJeopardySession(): StoredJeopardySession {
    return {
        frame: {
            id: 'none'
        },
        internal: createEmptyJeopardySessionInternal(),
        isPaused: false,
        meta: {
            answerRequestRemainingMs: null,
            currentQuestionFlow: null,
            mediaElapsedTimeMs: 0,
            mediaStartedAt: null,
            pausedTasks: []
        }
    }
}

export class LobbyRoomDO extends DurableObject<RealtimeWorkerEnv> {
    private readonly scheduler: RoomScheduler<RoomScheduledTaskPayload>

    constructor(ctx: DurableObjectState, env: RealtimeWorkerEnv) {
        super(ctx, env)

        this.scheduler = new RoomScheduler(ctx.storage)
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
                const joinResult = this.joinRoom(state, attachment.user, request.payload.role, request.payload.password)

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
                const tipResult = this.tipMember(state, attachment.user.id, request.payload.id, request.payload.toUserId)

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
                const chatResult = this.addChatMessage(state, attachment.user.id, request.payload.text)

                if (!chatResult.success) {
                    this.sendError(ws, chatResult.message, chatResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
                return
            }
            case 'ready.start': {
                const readyStartResult = this.startReadyCheck(state, attachment.user.id)

                if (!readyStartResult.success) {
                    this.sendError(ws, readyStartResult.message, readyStartResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
                return
            }
            case 'ready.set': {
                const readySetResult = this.setReadyState(state, attachment.user.id, request.payload.ready)

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
                const moveResult = this.makeMove(state, attachment.user.id, request.payload.cell)

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
                const clickResult = await this.handleClickerClick(state, attachment.user.id, request.payload.x, request.payload.y)

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
                const actionResult = await this.handleJeopardyAction(state, attachment.user.id, request.payload.actionName, request.payload.actionPayload)

                if (!actionResult.success) {
                    this.sendError(ws, actionResult.message, actionResult.code)
                    return
                }

                if (actionResult.action) {
                    if (actionResult.publishToMasterOnly) {
                        const master = this.getJeopardyMaster(state)

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
                          session: createIdleTicTacToeSession()
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
            responseBody.sessionInternal = this.toJeopardyInternalView(state.game.session.internal)
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

        const result = this.joinRoom(state, identity.user, body.role, body.password)

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
                            internal: this.toJeopardyInternalView(state.game.session.internal)
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
                      session: state.game.session ? this.toPublicJeopardySession(state.game.session) : null
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

    private toPublicJeopardySession(session: StoredJeopardySession): RealtimeJeopardyPublicSession {
        const { internal: _internal, meta: _meta, ...publicSession } = session

        if (publicSession.frame.id === 'question-content') {
            return {
                ...publicSession,
                frame: {
                    ...publicSession.frame,
                    elapsedMediaTimeMs: this.getJeopardyMediaElapsedTimeMs(session)
                }
            }
        }

        return publicSession
    }

    private getJeopardyMediaElapsedTimeMs(session: StoredJeopardySession): number | undefined {
        if (session.frame.id !== 'question-content' || (session.frame.type !== 'video' && session.frame.type !== 'voice')) {
            return undefined
        }

        const runningElapsedMs = session.meta.mediaStartedAt ? Date.now() - new Date(session.meta.mediaStartedAt).getTime() : 0

        return session.meta.mediaElapsedTimeMs + Math.max(runningElapsedMs, 0)
    }

    private getJeopardyMaster(state: StoredLobbyState): StoredLobbyMember | null {
        return state.members.find(member => member.id === state.creatorUserId && member.role === 'player') || null
    }

    private getJeopardyContestants(state: StoredLobbyState): StoredLobbyMember[] {
        return state.members.filter(member => member.role === 'player' && member.id !== state.creatorUserId)
    }

    private toJeopardyWinner(member: StoredLobbyMember): RealtimeJeopardyWinner {
        return {
            id: member.id,
            playerIsMaster: member.isCreator,
            playerScore: member.playerScore,
            userAvatarUrl: member.userAvatarUrl,
            userColor: member.userColor,
            userIsOnline: this.ctx.getWebSockets(userTag(member.id)).length > 0,
            userNickname: member.userNickname
        }
    }

    private sendJeopardyInternalSessionUpdate(state: StoredLobbyState): void {
        if (state.game.name !== 'Jeopardy' || !state.game.session) {
            return
        }

        const master = this.getJeopardyMaster(state)

        if (!master) {
            return
        }

        this.sendServerMessageToUser(master.id, {
            type: 'game.session.update',
            payload: {
                data: {
                    internal: this.toJeopardyInternalView(state.game.session.internal)
                }
            }
        })
    }

    private broadcastJeopardySessionStart(state: StoredLobbyState): void {
        if (state.game.name !== 'Jeopardy' || !state.game.session) {
            return
        }

        this.broadcastServerMessage({
            type: 'game.session.start',
            payload: {
                session: this.toPublicJeopardySession(state.game.session)
            }
        })
        this.sendJeopardyInternalSessionUpdate(state)
    }

    private broadcastJeopardySessionUpdate(state: StoredLobbyState, data: Partial<RealtimeJeopardyPublicSession>): void {
        if (state.game.name !== 'Jeopardy' || !state.game.session) {
            return
        }

        this.broadcastServerMessage({
            type: 'game.session.update',
            payload: {
                data
            }
        })
    }

    private broadcastJeopardySessionEnd(state: StoredLobbyState, session: RealtimeJeopardyPublicSession): void {
        this.broadcastServerMessage({
            type: 'game.session.end',
            payload: {
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        ...this.toJeopardyWinner(member)
                    })),
                session
            }
        })
    }

    private isGameInProgress(state: StoredLobbyState): boolean {
        if (state.game.name === 'Clicker') {
            return state.game.session.status !== 'idle'
        }

        if (state.game.name === 'Jeopardy') {
            return Boolean(state.game.session)
        }

        return state.game.session.status === 'active'
    }

    private toJeopardyInternalView(internal: RealtimeJeopardySessionInternal): RealtimeJeopardySessionInternal {
        const { roomSessionId: _roomSessionId, ...sessionInternal } = internal as RealtimeJeopardySessionInternal & { roomSessionId?: string }

        return sessionInternal
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

    private joinRoom(
        state: StoredLobbyState,
        user: IdentityProfile,
        role: RealtimeLobbyMemberRole,
        password?: string
    ): { success: true; message: string } | { success: false; message: string; code: string } {
        if (state.password && state.password !== (password || '')) {
            return {
                success: false,
                message: 'Incorrect password',
                code: 'incorrect_password'
            }
        }

        const existingMember = state.members.find(member => member.id === user.id)
        const maxPlayers = state.game.name === 'TicTacToe' ? 2 : Number.POSITIVE_INFINITY

        if (existingMember) {
            if (existingMember.isCreator && state.game.name === 'Jeopardy' && role !== 'player') {
                return {
                    success: false,
                    message: 'Jeopardy master must stay a player',
                    code: 'creator_must_be_player'
                }
            }

            if (existingMember.role === role) {
                this.refreshStoredMember(existingMember, user)
                return {
                    success: true,
                    message: `${user.userNickname} rejoined the room`
                }
            }

            if (this.isGameInProgress(state)) {
                return {
                    success: false,
                    message: 'Cannot change roles during an active game',
                    code: 'game_in_progress'
                }
            }

            if (role === 'player' && state.members.filter(member => member.role === 'player' && member.id !== user.id).length >= maxPlayers) {
                return {
                    success: false,
                    message: 'Player slots are full',
                    code: 'player_slots_full'
                }
            }

            this.refreshStoredMember(existingMember, user)
            existingMember.role = role
            this.normalizePlayerAssignments(state)
            this.resetReadyCheck(state)

            return {
                success: true,
                message: `${user.userNickname} switched to ${role}`
            }
        }

        if (user.id === state.creatorUserId && state.game.name === 'Jeopardy' && role !== 'player') {
            return {
                success: false,
                message: 'Jeopardy master must stay a player',
                code: 'creator_must_be_player'
            }
        }

        if (role === 'player' && state.members.filter(member => member.role === 'player').length >= maxPlayers) {
            return {
                success: false,
                message: 'Player slots are full',
                code: 'player_slots_full'
            }
        }

        const joinedAt = nowIso()

        state.members.push({
            ...user,
            isCreator: false,
            joinedAt,
            playerChar: null,
            playerIsClickAllowed: true,
            playerScore: 0,
            ready: null,
            role
        })

        this.normalizePlayerAssignments(state)
        this.resetReadyCheck(state)

        return {
            success: true,
            message: `${user.userNickname} joined as ${role}`
        }
    }

    private tipMember(
        state: StoredLobbyState,
        fromUserId: string,
        tipId: string,
        toUserId: string
    ): { success: true; tip: { from: string; id: string; lobbyId: string; to: string } } | { success: false; message: string; code: string } {
        const fromMember = state.members.find(member => member.id === fromUserId)
        const toMember = state.members.find(member => member.id === toUserId)

        if (!fromMember) {
            return {
                success: false,
                message: 'Join the room before tipping',
                code: 'not_in_room'
            }
        }

        if (!toMember) {
            return {
                success: false,
                message: 'Tip target is not in this room',
                code: 'tip_target_missing'
            }
        }

        if (fromMember.id === toMember.id) {
            return {
                success: false,
                message: 'You cannot tip yourself',
                code: 'cannot_tip_self'
            }
        }

        return {
            success: true,
            tip: {
                from: fromMember.userNickname,
                id: tipId,
                lobbyId: state.roomId,
                to: toMember.userNickname
            }
        }
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

        this.normalizePlayerAssignments(state)
        this.resetReadyCheck(state)

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

        this.normalizePlayerAssignments(state)
        this.resetReadyCheck(state)

        return {
            success: true,
            memberId: member.id
        }
    }

    private addChatMessage(state: StoredLobbyState, userId: string, text: string): { success: true } | { success: false; message: string; code: string } {
        const member = state.members.find(item => item.id === userId)

        if (!member) {
            return {
                success: false,
                message: 'Join the room before sending messages',
                code: 'not_in_room'
            }
        }

        const normalizedText = text.trim()

        if (!normalizedText.length) {
            return {
                success: false,
                message: 'Message cannot be empty',
                code: 'empty_message'
            }
        }

        state.chat.push({
            id: crypto.randomUUID(),
            createdAt: nowIso(),
            from: member.userNickname,
            fromColor: member.userColor,
            fromUserId: member.id,
            text: normalizedText
        })

        state.chat = state.chat.slice(-100)

        return {
            success: true
        }
    }

    private startReadyCheck(state: StoredLobbyState, userId: string): { success: true } | { success: false; message: string; code: string } {
        if (state.creatorUserId !== userId) {
            return {
                success: false,
                message: 'Only the lobby creator can start the ready check',
                code: 'forbidden'
            }
        }

        if (this.isGameInProgress(state)) {
            return {
                success: false,
                message: 'Cannot start a ready check during an active game',
                code: 'game_in_progress'
            }
        }

        const players = state.members.filter(member => member.role === 'player')

        const isValidPlayerCount =
            state.game.name === 'Clicker' ? players.length >= 1 : state.game.name === 'Jeopardy' ? players.length >= 2 : players.length === 2

        if (!isValidPlayerCount) {
            return {
                success: false,
                message:
                    state.game.name === 'Clicker'
                        ? 'Clicker requires at least 1 player'
                        : state.game.name === 'Jeopardy'
                        ? 'Jeopardy requires the master and at least 1 contestant'
                        : 'TicTacToe requires exactly 2 players',
                code: 'invalid_player_count'
            }
        }

        state.members.forEach(member => {
            member.ready = players.some(player => player.id === member.id) ? null : member.ready
        })

        state.readyCheck = {
            participants: players.map(player => player.id),
            status: 'active',
            updatedAt: nowIso()
        }

        return {
            success: true
        }
    }

    private setReadyState(state: StoredLobbyState, userId: string, ready: boolean): { success: true } | { success: false; message: string; code: string } {
        if (state.readyCheck.status !== 'active') {
            return {
                success: false,
                message: 'There is no active ready check',
                code: 'ready_check_inactive'
            }
        }

        if (!state.readyCheck.participants.includes(userId)) {
            return {
                success: false,
                message: 'Only active players can respond to the ready check',
                code: 'not_ready_participant'
            }
        }

        const member = state.members.find(item => item.id === userId)

        if (!member) {
            return {
                success: false,
                message: 'Join the room before responding',
                code: 'not_in_room'
            }
        }

        member.ready = ready
        state.readyCheck.updatedAt = nowIso()

        if (!ready) {
            state.readyCheck.status = 'failed'
            return {
                success: true
            }
        }

        const everyoneReady = state.readyCheck.participants.every(participantId => {
            const participant = state.members.find(memberItem => memberItem.id === participantId)
            return participant?.ready === true
        })

        if (everyoneReady) {
            state.readyCheck.status = 'success'
        }

        return {
            success: true
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
            return this.startClickerGame(state, userId)
        }

        if (state.game.name === 'Jeopardy') {
            return this.startJeopardyGame(state, userId)
        }

        return this.startTicTacToeGame(state, userId)
    }

    private startTicTacToeGame(
        state: StoredLobbyState,
        userId: string
    ):
        | {
              success: true
              action?: LobbyRoomGameActionMessage
              startedSession?: StartedRoomSession
              stateChanged: boolean
          }
        | {
              success: false
              message: string
              code: string
          } {
        if (state.game.name !== 'TicTacToe') {
            return {
                success: false,
                message: 'This room does not run TicTacToe',
                code: 'invalid_game'
            }
        }

        if (state.creatorUserId !== userId) {
            return {
                success: false,
                message: 'Only the lobby creator can start the game',
                code: 'forbidden'
            }
        }

        const players = state.members.filter(member => member.role === 'player')

        if (players.length !== 2) {
            return {
                success: false,
                message: 'TicTacToe requires exactly 2 players',
                code: 'invalid_player_count'
            }
        }

        const allPlayersReady = players.every(player => player.ready === true)

        if (!allPlayersReady) {
            return {
                success: false,
                message: 'Run the ready check and wait for both players to confirm',
                code: 'players_not_ready'
            }
        }

        const orderedPlayers = [...players].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))

        const startedAt = nowIso()

        const sessionId = crypto.randomUUID()

        state.game.session = {
            board: createEmptyBoard(),
            endedAt: null,
            id: sessionId,
            isDraw: false,
            startedAt,
            status: 'active',
            turnUserId: orderedPlayers[0].id,
            winLine: null,
            winnerUserId: null
        }

        this.resetReadyCheck(state)

        return {
            success: true,
            startedSession: {
                gameName: state.game.name,
                id: sessionId,
                initiatedByUserId: userId,
                startedAt
            },
            stateChanged: true
        }
    }

    private async startClickerGame(
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
              message: string
              code: string
          }
    > {
        if (state.game.name !== 'Clicker') {
            return {
                success: false,
                message: 'This room does not run Clicker',
                code: 'invalid_game'
            }
        }

        const player = state.members.find(member => member.id === userId && member.role === 'player')

        if (!player) {
            return {
                success: false,
                message: 'Only players can start Clicker',
                code: 'not_a_player'
            }
        }

        if (state.game.session.status !== 'idle') {
            return {
                success: false,
                message: 'A Clicker session is already in progress',
                code: 'game_in_progress'
            }
        }

        const players = state.members.filter(member => member.role === 'player')

        if (!players.length) {
            return {
                success: false,
                message: 'Clicker requires at least 1 player',
                code: 'invalid_player_count'
            }
        }

        players.forEach(member => {
            member.playerIsClickAllowed = true
        })

        const sessionId = crypto.randomUUID()
        const startedAt = nowIso()

        state.game.session = {
            endedAt: null,
            id: sessionId,
            playerIsClickAllowed: false,
            startedAt,
            status: 'waiting',
            winnerUserId: null
        }

        this.resetReadyCheck(state)

        await this.scheduler.schedule({
            key: this.getClickerAllowClickTaskKey(sessionId),
            payload: {
                sessionId,
                type: 'clicker.allow-click'
            },
            scheduledAt: Date.now() + getRandomClickerAllowDelayMs()
        })

        return {
            success: true,
            startedSession: {
                gameName: state.game.name,
                id: sessionId,
                initiatedByUserId: userId,
                startedAt
            },
            stateChanged: true
        }
    }

    private async startJeopardyGame(
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
              message: string
              code: string
          }
    > {
        if (state.game.name !== 'Jeopardy') {
            return {
                success: false,
                message: 'This room does not run Jeopardy',
                code: 'invalid_game'
            }
        }

        if (state.creatorUserId !== userId) {
            return {
                success: false,
                message: 'Only the Jeopardy master can start the game',
                code: 'forbidden'
            }
        }

        if (state.game.session) {
            return {
                success: false,
                message: 'A Jeopardy session is already in progress',
                code: 'game_in_progress'
            }
        }

        const players = state.members.filter(member => member.role === 'player')
        const contestants = this.getJeopardyContestants(state)

        if (players.length < 2 || contestants.length < 1) {
            return {
                success: false,
                message: 'Jeopardy requires the master and at least 1 contestant',
                code: 'invalid_player_count'
            }
        }

        const allPlayersReady = players.every(player => player.ready === true)

        if (!allPlayersReady) {
            return {
                success: false,
                message: 'Run the ready check and wait for all players to confirm',
                code: 'players_not_ready'
            }
        }

        const sessionId = crypto.randomUUID()
        const startedAt = nowIso()

        state.game.session = createEmptyJeopardySession()
        this.setJeopardyRoomSessionId(state, sessionId)

        await this.beginJeopardyPackPreview(state, sessionId)
        this.resetReadyCheck(state)
        this.broadcastJeopardySessionStart(state)

        return {
            success: true,
            startedSession: {
                gameName: state.game.name,
                id: sessionId,
                initiatedByUserId: userId,
                startedAt
            },
            stateChanged: true
        }
    }

    private getJeopardyGame(state: StoredLobbyState): StoredJeopardyGame | null {
        return state.game.name === 'Jeopardy' ? state.game : null
    }

    private getJeopardySession(state: StoredLobbyState): StoredJeopardySession | null {
        return state.game.name === 'Jeopardy' ? state.game.session : null
    }

    private createSuccessfulGameAction(actor: { id: string; type: 'game' | 'player' }, actionName: string, actionPayload: unknown, actionResult?: unknown) {
        return this.createGameActionMessage({
            actor,
            actionName,
            actionPayload,
            actionResult: {
                success: true,
                ...(actionResult && typeof actionResult === 'object' ? actionResult : {})
            }
        })
    }

    private getJeopardySessionTaskPrefix(sessionId: string): string {
        return `jeopardy:${sessionId}:`
    }

    private getJeopardyTaskKey(sessionId: string, suffix: string): string {
        return `${this.getJeopardySessionTaskPrefix(sessionId)}${suffix}`
    }

    private async scheduleJeopardyTask(sessionId: string, suffix: string, payload: RoomScheduledTaskPayload, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            key: this.getJeopardyTaskKey(sessionId, suffix),
            payload,
            scheduledAt: Date.now() + Math.max(delayMs, 0)
        })
    }

    private async cancelJeopardyTask(sessionId: string, suffix: string): Promise<void> {
        await this.scheduler.cancel(this.getJeopardyTaskKey(sessionId, suffix))
    }

    private async cancelJeopardySessionTasks(sessionId: string): Promise<void> {
        await this.scheduler.cancelByPrefix(this.getJeopardySessionTaskPrefix(sessionId))
    }

    private updateJeopardyInternal(state: StoredLobbyState, patch: Partial<RealtimeJeopardySessionInternal>): void {
        const session = this.getJeopardySession(state)

        if (!session) {
            return
        }

        session.internal = {
            ...session.internal,
            ...patch
        }

        this.sendJeopardyInternalSessionUpdate(state)
    }

    private updateJeopardyFrame(state: StoredLobbyState, frame: RealtimeJeopardyState.Frame): void {
        const session = this.getJeopardySession(state)

        if (!session) {
            return
        }

        session.frame = frame
        this.broadcastJeopardySessionUpdate(state, {
            frame,
            isPaused: session.isPaused
        })
    }

    private async beginJeopardyPackPreview(state: StoredLobbyState, sessionId: string): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session) {
            return
        }

        session.internal = createEmptyJeopardySessionInternal()
        ;(session.internal as RealtimeJeopardySessionInternal & { roomSessionId?: string }).roomSessionId = sessionId
        session.isPaused = false
        session.meta.answerRequestRemainingMs = null
        session.meta.currentQuestionFlow = null
        session.meta.mediaElapsedTimeMs = 0
        session.meta.mediaStartedAt = null
        session.meta.pausedTasks = []
        session.frame = {
            id: 'pack-preview',
            packName: game.packName,
            author: game.packAuthor,
            dateCreated: game.packDateCreated,
            themes: shuffle([...getNonFinalThemes(game.packDeclaration)])
        }

        await this.scheduleJeopardyTask(
            sessionId,
            'pack-preview.complete',
            { sessionId, type: 'jeopardy.pack-preview.complete' },
            JEOPARDY_PACK_PREVIEW_DURATION_MS
        )
    }

    private getActiveJeopardyRoomSessionId(state: StoredLobbyState): string | null {
        const activeSession = state.game.name === 'Jeopardy' ? state.game.session : null

        if (!activeSession) {
            return null
        }

        return ((activeSession.internal as RealtimeJeopardySessionInternal & { roomSessionId?: string }).roomSessionId as string | undefined) || null
    }

    private setJeopardyRoomSessionId(state: StoredLobbyState, roomSessionId: string): void {
        const session = this.getJeopardySession(state)

        if (!session) {
            return
        }

        ;(session.internal as RealtimeJeopardySessionInternal & { roomSessionId?: string }).roomSessionId = roomSessionId
    }

    private async beginJeopardyRoundPreview(state: StoredLobbyState, roundId: number): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session) {
            return
        }

        const round = getRoundThemeNames(game.packDeclaration, roundId)
        const sessionId = this.getActiveJeopardyRoomSessionId(state)

        if (!round || !sessionId) {
            return
        }

        session.frame = {
            id: 'rounds-preview',
            isRoundName: true,
            text: round.roundName
        }

        this.broadcastJeopardySessionUpdate(state, {
            frame: session.frame,
            isPaused: session.isPaused
        })
        this.broadcastGameAction(
            this.createSuccessfulGameAction(
                {
                    id: 'game',
                    type: 'game'
                },
                '$RoundPreview',
                {
                    roundId
                }
            )
        )

        await this.scheduler.cancelByPrefix(this.getJeopardyTaskKey(sessionId, 'round-preview.theme.'))
        await this.cancelJeopardyTask(sessionId, 'round-preview.complete').catch(() => null)

        await Promise.all(
            round.themeNames.map((_, themeIndex) =>
                this.scheduleJeopardyTask(
                    sessionId,
                    `round-preview.theme.${themeIndex}`,
                    {
                        roundId,
                        sessionId,
                        themeIndex,
                        type: 'jeopardy.round-preview.theme'
                    },
                    JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS + JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS * themeIndex
                )
            )
        )

        await this.scheduleJeopardyTask(
            sessionId,
            'round-preview.complete',
            {
                roundId,
                sessionId,
                type: 'jeopardy.round-preview.complete'
            },
            JEOPARDY_ROUND_NAME_PREVIEW_DURATION_MS + JEOPARDY_ROUND_THEME_PREVIEW_DURATION_MS * round.themeNames.length
        )
    }

    private showJeopardyQuestionBoard(state: StoredLobbyState, roundId: number): void {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session) {
            return
        }

        const pickerId = session.internal.pickerId || state.creatorUserId
        const themes = getRoundQuestionViewData(game.packDeclaration, roundId)

        if (!themes) {
            return
        }

        this.updateJeopardyFrame(state, {
            id: 'question-board',
            pickerId,
            roundId,
            themes: themes.map(theme => ({
                ...theme,
                question: theme.question.map(question => ({
                    ...question,
                    isAnswered: session.internal.answeredQuestions.includes(question.questionId)
                }))
            }))
        })
    }

    private async beginJeopardyQuestion(state: StoredLobbyState, questionId: RealtimeJeopardyQuestionId): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session) {
            return
        }

        const scenario = getQuestionScenarioById(game.packDeclaration, questionId)

        if (!scenario) {
            return
        }

        session.meta.currentQuestionFlow = {
            afterAtoms: scenario[1],
            beforeAtoms: scenario[0],
            questionId,
            shownAtomIndex: -1,
            stage: 'before'
        }
        session.meta.answerRequestRemainingMs = null

        await this.showNextJeopardyQuestionAtom(state)
    }

    private async showNextJeopardyQuestionAtom(state: StoredLobbyState): Promise<void> {
        const session = this.getJeopardySession(state)

        if (!session || !session.meta.currentQuestionFlow) {
            return
        }

        const flow = session.meta.currentQuestionFlow
        const atoms = flow.stage === 'before' ? flow.beforeAtoms : flow.afterAtoms
        const nextIndex = flow.shownAtomIndex + 1

        if (nextIndex >= atoms.length) {
            if (flow.stage === 'before') {
                await this.beginJeopardyAnswerRequest(state, JEOPARDY_ANSWER_REQUEST_DURATION_MS)
                return
            }

            await this.finalizeJeopardyQuestion(state)
            return
        }

        flow.shownAtomIndex = nextIndex
        await this.showJeopardyQuestionAtom(state, flow.questionId, atoms[nextIndex], flow.stage === 'before')
    }

    private async showJeopardyQuestionAtom(
        state: StoredLobbyState,
        questionId: RealtimeJeopardyQuestionId,
        atom: JeopardyDeclaration.QuestionScenarioContentAtom,
        beforeMarker: boolean
    ): Promise<void> {
        const session = this.getJeopardySession(state)
        const sessionId = this.getActiveJeopardyRoomSessionId(state)

        if (!session || !sessionId) {
            return
        }

        const previousPlayersOnCooldown = session.frame.id === 'question-content' ? [...session.frame.playersOnCooldown] : ([] as string[])
        const previousPlayersWhoAnswered = session.frame.id === 'question-content' ? [...session.frame.playersWhoAnswered] : ([] as string[])
        const type = '_attributes' in atom ? atom._attributes.type : 'text'

        if (beforeMarker) {
            this.updateJeopardyInternal(state, {
                answerIsApproved: null,
                correctAnswers: null,
                currentAnsweringPlayerAnswerText: null,
                currentAnsweringPlayerId: null,
                incorrectAnswers: null
            })
        }

        session.meta.mediaElapsedTimeMs = 0
        session.meta.mediaStartedAt = type === 'video' || type === 'voice' ? nowIso() : null

        this.updateJeopardyFrame(state, {
            questionId,
            id: 'question-content',
            type,
            content: atom._text,
            answeringStatus: beforeMarker ? 'too-early' : 'too-late',
            answerRequestTimeLeft: null,
            answerGivingTimeLeft: null,
            answerVerifyingTimeLeft: null,
            playersOnCooldown: previousPlayersOnCooldown,
            playersWhoAnswered: previousPlayersWhoAnswered,
            answeringPlayerId: null,
            skipVoted: [],
            result: undefined,
            mediaStartedAt: session.meta.mediaStartedAt,
            elapsedMediaTimeMs: this.getJeopardyMediaElapsedTimeMs(session)
        })

        if (type === 'video' || type === 'voice') {
            return
        }

        await this.scheduleJeopardyTask(
            sessionId,
            'question.atom.complete',
            {
                sessionId,
                type: 'jeopardy.question.atom.complete'
            },
            JEOPARDY_CONTENT_DEFAULT_DURATION_MS
        )
    }

    private async beginJeopardyAnswerRequest(state: StoredLobbyState, durationMs: number): Promise<void> {
        const session = this.getJeopardySession(state)
        const sessionId = this.getActiveJeopardyRoomSessionId(state)

        if (!session || !sessionId || session.frame.id !== 'question-content') {
            return
        }

        session.meta.answerRequestRemainingMs = durationMs

        this.updateJeopardyFrame(state, {
            ...session.frame,
            answeringPlayerId: null,
            answeringStatus: 'allowed',
            answerRequestStartedAt: nowIso(),
            answerRequestEndsAt: new Date(Date.now() + durationMs).toISOString(),
            answerRequestTimeLeft: 100,
            answerGivingStartedAt: null,
            answerGivingEndsAt: null,
            answerGivingTimeLeft: null,
            answerVerifyingStartedAt: null,
            answerVerifyingEndsAt: null,
            answerVerifyingTimeLeft: null,
            result: undefined
        })

        await this.scheduleJeopardyTask(
            sessionId,
            'answer-request.complete',
            {
                sessionId,
                type: 'jeopardy.answer-request.complete'
            },
            durationMs
        )
    }

    private async beginJeopardyAnswerVerifying(state: StoredLobbyState): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)
        const sessionId = this.getActiveJeopardyRoomSessionId(state)

        if (!game || !session || !sessionId || session.frame.id !== 'question-content') {
            return
        }

        const answers = getJeopardyAnswers(game.packDeclaration, session.frame.questionId)

        if (!answers) {
            return
        }

        this.updateJeopardyInternal(state, {
            correctAnswers: answers[0],
            incorrectAnswers: answers[1]
        })

        this.updateJeopardyFrame(state, {
            ...session.frame,
            answeringPlayerId: null,
            answeringStatus: 'answer-verifying',
            answerGivingStartedAt: null,
            answerGivingEndsAt: null,
            answerGivingTimeLeft: null,
            answerRequestStartedAt: null,
            answerRequestEndsAt: null,
            answerRequestTimeLeft: null,
            answerVerifyingStartedAt: nowIso(),
            answerVerifyingEndsAt: new Date(Date.now() + JEOPARDY_ANSWER_VERIFYING_DURATION_MS).toISOString(),
            answerVerifyingTimeLeft: 100
        })

        await this.scheduleJeopardyTask(
            sessionId,
            'answer-verifying.complete',
            {
                sessionId,
                type: 'jeopardy.answer-verifying.complete'
            },
            JEOPARDY_ANSWER_VERIFYING_DURATION_MS
        )
    }

    private async continueJeopardyQuestionAfterAnswerResolution(state: StoredLobbyState, approved: boolean): Promise<void> {
        const session = this.getJeopardySession(state)

        if (!session || session.frame.id !== 'question-content') {
            return
        }

        if (!approved && (session.meta.answerRequestRemainingMs || 0) > 0) {
            await this.beginJeopardyAnswerRequest(state, session.meta.answerRequestRemainingMs || 0)
            return
        }

        session.meta.answerRequestRemainingMs = null

        if (session.meta.currentQuestionFlow) {
            session.meta.currentQuestionFlow.stage = 'after'
            session.meta.currentQuestionFlow.shownAtomIndex = -1
        }

        await this.showNextJeopardyQuestionAtom(state)
    }

    private async finalizeJeopardyQuestion(state: StoredLobbyState): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session || !session.meta.currentQuestionFlow) {
            return
        }

        const questionId = session.meta.currentQuestionFlow.questionId
        const answeredQuestions = session.internal.answeredQuestions.includes(questionId)
            ? session.internal.answeredQuestions
            : [...session.internal.answeredQuestions, questionId]

        session.meta.currentQuestionFlow = null
        session.meta.answerRequestRemainingMs = null
        session.meta.mediaElapsedTimeMs = 0
        session.meta.mediaStartedAt = null

        this.updateJeopardyInternal(state, {
            answeredQuestions
        })

        const roundId = session.internal.currentRoundId
        const roundQuestions = getRoundQuestions(game.packDeclaration, roundId) || []
        const roundCompleted = roundQuestions.every(id => answeredQuestions.includes(id))

        if (!roundCompleted) {
            this.showJeopardyQuestionBoard(state, roundId)
            return
        }

        const nextRoundId = roundId + 1

        if (nextRoundId > getRoundsCount(game.packDeclaration) - 1) {
            await this.showJeopardyFinalScores(state)
            return
        }

        this.updateJeopardyInternal(state, {
            currentRoundId: nextRoundId
        })

        if (isFinalRound(game.packDeclaration, nextRoundId)) {
            if (this.getJeopardyContestants(state).some(player => player.playerScore > 0)) {
                await this.beginJeopardyRoundPreview(state, nextRoundId)
            } else {
                await this.showJeopardyFinalScores(state)
            }

            return
        }

        await this.beginJeopardyRoundPreview(state, nextRoundId)
    }

    private async showJeopardyFinalRoundBoard(state: StoredLobbyState): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session) {
            return
        }

        this.updateJeopardyFrame(state, {
            id: 'final-round-board',
            themes: getFinalThemes(game.packDeclaration).map(name => ({
                name,
                skipped: false
            })),
            skipperId: session.internal.pickerId,
            playersThatAnswered: [],
            playersThatMadeBet: [],
            status: 'skipping'
        })
    }

    private async beginJeopardyFinalRoundBetting(state: StoredLobbyState): Promise<void> {
        const session = this.getJeopardySession(state)

        if (!session || session.frame.id !== 'final-round-board') {
            return
        }

        this.updateJeopardyFrame(state, {
            ...session.frame,
            status: 'betting'
        })
    }

    private async beginJeopardyFinalQuestionAnswering(state: StoredLobbyState): Promise<void> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)

        if (!game || !session || session.frame.id !== 'final-round-board') {
            return
        }

        const themeIndex = session.frame.themes.findIndex(theme => !theme.skipped)
        const finalRoundIndex = getRoundsCount(game.packDeclaration) - 1
        const questionId = `${finalRoundIndex}-${themeIndex}-0` as RealtimeJeopardyQuestionId
        const scenario = getQuestionScenarioById(game.packDeclaration, questionId)
        const answers = getJeopardyAnswers(game.packDeclaration, questionId)

        if (!scenario || !answers) {
            return
        }

        this.updateJeopardyInternal(state, {
            correctAnswers: answers[0],
            incorrectAnswers: answers[1]
        })

        this.updateJeopardyFrame(state, {
            ...session.frame,
            skipperId: null,
            status: 'answering',
            questionAtoms: scenario[0].map(atom => ({
                content: atom._text,
                type: '_attributes' in atom ? atom._attributes.type : 'text'
            }))
        })
    }

    private beginJeopardyFinalQuestionVerifying(state: StoredLobbyState): void {
        const session = this.getJeopardySession(state)

        if (!session || session.frame.id !== 'final-round-board') {
            return
        }

        this.updateJeopardyFrame(state, {
            ...session.frame,
            status: 'answer-verifying'
        })
    }

    private async showJeopardyFinalScores(state: StoredLobbyState): Promise<void> {
        const session = this.getJeopardySession(state)

        if (!session) {
            return
        }

        const winner =
            state.members
                .filter(member => member.role === 'player')
                .reduce(
                    (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                    null as StoredLobbyMember | null
                ) ||
            state.members.find(member => member.role === 'player') ||
            state.members[0]

        if (!winner) {
            return
        }

        this.updateJeopardyFrame(state, {
            id: 'final-score',
            winner: this.toJeopardyWinner(winner)
        })

        await this.persistFinalizedRoomSession(this.createCompletedJeopardyRoomSessionRecord(state))
    }

    private async pauseJeopardySession(state: StoredLobbyState): Promise<JeopardyActionResult> {
        const session = this.getJeopardySession(state)
        const sessionId = this.getActiveJeopardyRoomSessionId(state)

        if (!session || !sessionId) {
            return {
                code: 'game_not_started',
                message: 'There is no active Jeopardy session',
                success: false
            }
        }

        if (session.isPaused) {
            return {
                code: 'already_paused',
                message: 'Jeopardy is already paused',
                success: false
            }
        }

        const nowMs = Date.now()
        const tasks = (await this.scheduler.list()).filter(task => task.key.startsWith(this.getJeopardySessionTaskPrefix(sessionId)))

        session.meta.pausedTasks = tasks.map(task => ({
            key: task.key,
            payload: task.payload,
            remainingMs: Math.max(task.scheduledAt - nowMs, 0)
        }))

        await this.cancelJeopardySessionTasks(sessionId)

        if (session.frame.id === 'question-content' && (session.frame.type === 'video' || session.frame.type === 'voice') && session.meta.mediaStartedAt) {
            session.meta.mediaElapsedTimeMs += nowMs - new Date(session.meta.mediaStartedAt).getTime()
            session.meta.mediaStartedAt = null
        }

        session.isPaused = true
        this.broadcastJeopardySessionUpdate(state, {
            frame: this.toPublicJeopardySession(session).frame,
            isPaused: true
        })

        return {
            action: this.createSuccessfulGameAction(
                {
                    id: state.creatorUserId,
                    type: 'player'
                },
                '$Pause',
                null
            ),
            stateChanged: true,
            success: true
        }
    }

    private async resumeJeopardySession(state: StoredLobbyState): Promise<JeopardyActionResult> {
        const session = this.getJeopardySession(state)

        if (!session) {
            return {
                code: 'game_not_started',
                message: 'There is no active Jeopardy session',
                success: false
            }
        }

        if (!session.isPaused) {
            return {
                code: 'not_paused',
                message: 'Jeopardy is not paused',
                success: false
            }
        }

        const nowMs = Date.now()

        await Promise.all(
            session.meta.pausedTasks.map(task =>
                this.scheduler.schedule({
                    key: task.key,
                    payload: task.payload,
                    scheduledAt: nowMs + task.remainingMs
                })
            )
        )

        const getRemainingMs = (type: RoomScheduledTaskPayload['type']) =>
            session.meta.pausedTasks.find(task => task.payload.type === type)?.remainingMs || null

        session.meta.pausedTasks = []
        session.isPaused = false

        if (session.frame.id === 'question-content') {
            if (session.frame.answeringStatus === 'allowed') {
                const remainingMs = getRemainingMs('jeopardy.answer-request.complete')

                if (remainingMs) {
                    session.frame.answerRequestStartedAt = nowIso()
                    session.frame.answerRequestEndsAt = new Date(nowMs + remainingMs).toISOString()
                }
            } else if (session.frame.answeringStatus === 'answering') {
                const remainingMs = getRemainingMs('jeopardy.answer-giving.complete')

                if (remainingMs) {
                    session.frame.answerGivingStartedAt = nowIso()
                    session.frame.answerGivingEndsAt = new Date(nowMs + remainingMs).toISOString()
                }
            } else if (session.frame.answeringStatus === 'answer-verifying') {
                const remainingMs = getRemainingMs('jeopardy.answer-verifying.complete')

                if (remainingMs) {
                    session.frame.answerVerifyingStartedAt = nowIso()
                    session.frame.answerVerifyingEndsAt = new Date(nowMs + remainingMs).toISOString()
                }
            }

            if ((session.frame.type === 'video' || session.frame.type === 'voice') && session.meta.mediaStartedAt === null) {
                session.meta.mediaStartedAt = nowIso()
            }
        }

        this.broadcastJeopardySessionUpdate(state, {
            frame: this.toPublicJeopardySession(session).frame,
            isPaused: false
        })

        return {
            action: this.createSuccessfulGameAction(
                {
                    id: state.creatorUserId,
                    type: 'player'
                },
                '$Resume',
                null
            ),
            stateChanged: true,
            success: true
        }
    }

    private async handleJeopardyAction(state: StoredLobbyState, userId: string, actionName: string, actionPayload: unknown): Promise<JeopardyActionResult> {
        const game = this.getJeopardyGame(state)
        const session = this.getJeopardySession(state)
        const actor = state.members.find(member => member.id === userId && member.role === 'player')
        const isMaster = userId === state.creatorUserId

        if (!game || !session || !actor) {
            return {
                code: 'not_a_player',
                message: 'Only players can use Jeopardy controls',
                success: false
            }
        }

        if (session.isPaused && !['$Pause', '$Resume'].includes(actionName)) {
            return {
                code: 'session_paused',
                message: 'Jeopardy is paused',
                success: false
            }
        }

        switch (actionName) {
            case '$Pause':
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can pause the game',
                        success: false
                    }
                }

                return this.pauseJeopardySession(state)
            case '$Resume':
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can resume the game',
                        success: false
                    }
                }

                return this.resumeJeopardySession(state)
            case '$PickQuestion': {
                if (session.frame.id !== 'question-board') {
                    return {
                        code: 'invalid_frame',
                        message: 'You can only pick a question from the question board',
                        success: false
                    }
                }

                const payload = actionPayload as { questionId?: RealtimeJeopardyQuestionId } | null

                if (!payload?.questionId) {
                    return {
                        code: 'invalid_payload',
                        message: 'Question id is required',
                        success: false
                    }
                }

                if (!isMaster && session.frame.pickerId !== userId) {
                    return {
                        code: 'not_picker',
                        message: 'Only the current picker can choose a question',
                        success: false
                    }
                }

                if (session.frame.pickedQuestion) {
                    return {
                        code: 'already_picked',
                        message: `Question ${session.frame.pickedQuestion} is already being opened`,
                        success: false
                    }
                }

                if (!getJeopardyQuestionById(game.packDeclaration, payload.questionId)) {
                    return {
                        code: 'question_not_found',
                        message: 'Question not found',
                        success: false
                    }
                }

                if (session.internal.answeredQuestions.includes(payload.questionId)) {
                    return {
                        code: 'question_answered',
                        message: 'This question has already been answered',
                        success: false
                    }
                }

                this.updateJeopardyFrame(state, {
                    ...session.frame,
                    pickedQuestion: payload.questionId
                })

                const sessionId = this.getActiveJeopardyRoomSessionId(state)

                if (sessionId) {
                    await this.scheduleJeopardyTask(
                        sessionId,
                        'pick-question.complete',
                        {
                            questionId: payload.questionId,
                            sessionId,
                            type: 'jeopardy.pick-question.complete'
                        },
                        JEOPARDY_PICK_QUESTION_DELAY_MS
                    )
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$AnswerRequest': {
                if (session.frame.id !== 'question-content') {
                    return {
                        code: 'invalid_frame',
                        message: 'There is no active question to answer',
                        success: false
                    }
                }

                if (actor.id === state.creatorUserId) {
                    return {
                        code: 'master_cannot_answer',
                        message: 'The Jeopardy master cannot answer questions',
                        success: false
                    }
                }

                if (session.frame.playersOnCooldown.includes(userId) || session.frame.playersWhoAnswered.includes(userId)) {
                    return {
                        code: 'player_unavailable',
                        message: 'You already answered this question or are on cooldown',
                        success: false
                    }
                }

                if (session.frame.answeringStatus !== 'allowed' || session.frame.answeringPlayerId) {
                    const sessionId = this.getActiveJeopardyRoomSessionId(state)

                    if (sessionId) {
                        await this.scheduleJeopardyTask(
                            sessionId,
                            `cooldown.${userId}`,
                            {
                                sessionId,
                                type: 'jeopardy.cooldown.complete',
                                userId
                            },
                            JEOPARDY_ANSWER_COOLDOWN_MS
                        )
                    }

                    this.updateJeopardyFrame(state, {
                        ...session.frame,
                        playersOnCooldown: [...session.frame.playersOnCooldown, userId]
                    })

                    return {
                        action: this.createSuccessfulGameAction(
                            {
                                id: actor.id,
                                type: 'player'
                            },
                            '$AnswerRequest',
                            null,
                            {
                                isPlayerOnCooldown: true
                            }
                        ),
                        stateChanged: true,
                        success: true
                    }
                }

                const remainingMs = session.frame.answerRequestEndsAt
                    ? Math.max(new Date(session.frame.answerRequestEndsAt).getTime() - Date.now(), 0)
                    : JEOPARDY_ANSWER_REQUEST_DURATION_MS

                session.meta.answerRequestRemainingMs = remainingMs

                const sessionId = this.getActiveJeopardyRoomSessionId(state)

                if (sessionId) {
                    await this.cancelJeopardyTask(sessionId, 'answer-request.complete')
                    await this.scheduleJeopardyTask(
                        sessionId,
                        'answer-giving.complete',
                        {
                            sessionId,
                            type: 'jeopardy.answer-giving.complete'
                        },
                        JEOPARDY_ANSWER_GIVING_DURATION_MS
                    )
                }

                this.updateJeopardyFrame(state, {
                    ...session.frame,
                    answeringPlayerId: userId,
                    answeringStatus: 'answering',
                    answerRequestStartedAt: null,
                    answerRequestEndsAt: null,
                    answerRequestTimeLeft: null,
                    answerGivingStartedAt: nowIso(),
                    answerGivingEndsAt: new Date(Date.now() + JEOPARDY_ANSWER_GIVING_DURATION_MS).toISOString(),
                    answerGivingTimeLeft: 100,
                    playersWhoAnswered: [...session.frame.playersWhoAnswered, userId]
                })

                return {
                    action: this.createSuccessfulGameAction(
                        {
                            id: actor.id,
                            type: 'player'
                        },
                        '$AnswerRequest',
                        null,
                        {
                            isPlayerOnCooldown: false
                        }
                    ),
                    stateChanged: true,
                    success: true
                }
            }
            case '$GiveAnswer': {
                if (session.frame.id !== 'question-content' || session.frame.answeringStatus !== 'answering' || session.frame.answeringPlayerId !== userId) {
                    return {
                        code: 'invalid_answer_turn',
                        message: 'It is not your turn to answer',
                        success: false
                    }
                }

                const payload = actionPayload as { text?: string } | null

                this.updateJeopardyInternal(state, {
                    currentAnsweringPlayerAnswerText: payload?.text,
                    currentAnsweringPlayerId: userId
                })

                const sessionId = this.getActiveJeopardyRoomSessionId(state)

                if (sessionId) {
                    await this.cancelJeopardyTask(sessionId, 'answer-giving.complete')
                }

                await this.beginJeopardyAnswerVerifying(state)

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$RateAnswer': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can rate answers',
                        success: false
                    }
                }

                if (
                    session.frame.id !== 'question-content' ||
                    session.frame.answeringStatus !== 'answer-verifying' ||
                    !session.internal.currentAnsweringPlayerId
                ) {
                    return {
                        code: 'invalid_frame',
                        message: 'There is no answer to rate',
                        success: false
                    }
                }

                const payload = actionPayload as { rating?: 'approved' | 'declined' } | null

                if (!payload?.rating) {
                    return {
                        code: 'invalid_payload',
                        message: 'Rating is required',
                        success: false
                    }
                }

                const answeringPlayer = state.members.find(member => member.id === session.internal.currentAnsweringPlayerId && member.role === 'player')
                const question = getJeopardyQuestionById(game.packDeclaration, session.frame.questionId)

                if (!answeringPlayer || !question) {
                    return {
                        code: 'invalid_answer_state',
                        message: 'Answer state is invalid',
                        success: false
                    }
                }

                const delta = parseInt(question._attributes.price, 10)

                answeringPlayer.playerScore += payload.rating === 'approved' ? delta : -delta

                if (payload.rating === 'approved') {
                    this.updateJeopardyInternal(state, {
                        pickerId: answeringPlayer.id
                    })
                }

                this.updateJeopardyFrame(state, {
                    ...session.frame,
                    result: payload.rating
                })

                const sessionId = this.getActiveJeopardyRoomSessionId(state)

                if (sessionId) {
                    await this.cancelJeopardyTask(sessionId, 'answer-verifying.complete')
                }

                this.updateJeopardyInternal(state, {
                    correctAnswers: null,
                    currentAnsweringPlayerAnswerText: null,
                    currentAnsweringPlayerId: null,
                    incorrectAnswers: null
                })

                await this.continueJeopardyQuestionAfterAnswerResolution(state, payload.rating === 'approved')

                return {
                    action: this.createSuccessfulGameAction(
                        {
                            id: actor.id,
                            type: 'player'
                        },
                        '$RateAnswer',
                        {
                            rating: payload.rating
                        }
                    ),
                    stateChanged: true,
                    success: true
                }
            }
            case '$SkipVote': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can skip phases',
                        success: false
                    }
                }

                const sessionId = this.getActiveJeopardyRoomSessionId(state)

                if (!sessionId) {
                    return {
                        code: 'game_not_started',
                        message: 'There is no active Jeopardy session',
                        success: false
                    }
                }

                switch (session.frame.id) {
                    case 'pack-preview':
                        await this.cancelJeopardyTask(sessionId, 'pack-preview.complete')
                        await this.beginJeopardyRoundPreview(state, session.internal.currentRoundId)
                        return { stateChanged: true, success: true }
                    case 'rounds-preview':
                        await this.cancelJeopardyTask(sessionId, 'round-preview.complete')
                        await this.scheduler.cancelByPrefix(this.getJeopardyTaskKey(sessionId, 'round-preview.theme.'))

                        if (isFinalRound(game.packDeclaration, session.internal.currentRoundId)) {
                            await this.showJeopardyFinalRoundBoard(state)
                        } else {
                            this.showJeopardyQuestionBoard(state, session.internal.currentRoundId)
                        }

                        return { stateChanged: true, success: true }
                    case 'question-content':
                        if (session.frame.answeringStatus === 'allowed') {
                            await this.cancelJeopardyTask(sessionId, 'answer-request.complete')
                            await this.continueJeopardyQuestionAfterAnswerResolution(state, false)
                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'answering') {
                            await this.cancelJeopardyTask(sessionId, 'answer-giving.complete')
                            this.updateJeopardyInternal(state, {
                                currentAnsweringPlayerAnswerText: null,
                                currentAnsweringPlayerId: session.frame.answeringPlayerId
                            })
                            await this.beginJeopardyAnswerVerifying(state)
                            return { stateChanged: true, success: true }
                        }

                        if (session.frame.answeringStatus === 'answer-verifying') {
                            await this.cancelJeopardyTask(sessionId, 'answer-verifying.complete')
                            const currentAnsweringPlayerId = session.internal.currentAnsweringPlayerId
                            const question = getJeopardyQuestionById(game.packDeclaration, session.frame.questionId)

                            if (currentAnsweringPlayerId && question) {
                                const answeringPlayer = state.members.find(member => member.id === currentAnsweringPlayerId && member.role === 'player')

                                if (answeringPlayer) {
                                    answeringPlayer.playerScore -= parseInt(question._attributes.price, 10)
                                }
                            }

                            this.updateJeopardyInternal(state, {
                                correctAnswers: null,
                                currentAnsweringPlayerAnswerText: null,
                                currentAnsweringPlayerId: null,
                                incorrectAnswers: null
                            })
                            await this.continueJeopardyQuestionAfterAnswerResolution(state, false)
                            return { stateChanged: true, success: true }
                        }

                        await this.cancelJeopardyTask(sessionId, 'question.atom.complete').catch(() => null)

                        await this.showNextJeopardyQuestionAtom(state)
                        return { stateChanged: true, success: true }
                    default:
                        return {
                            code: 'invalid_frame',
                            message: 'This phase cannot be skipped',
                            success: false
                        }
                }
            }
            case '$SkipFinalTheme': {
                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'skipping') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final theme skipping is not active',
                        success: false
                    }
                }

                if (!isMaster && session.frame.skipperId !== userId) {
                    return {
                        code: 'not_skipper',
                        message: 'It is not your turn to skip a theme',
                        success: false
                    }
                }

                const payload = actionPayload as { themeIndex?: number } | null
                const themeIndex = payload?.themeIndex

                if (typeof themeIndex !== 'number') {
                    return {
                        code: 'invalid_payload',
                        message: 'Theme index is required',
                        success: false
                    }
                }

                const theme = session.frame.themes[themeIndex]

                if (!theme) {
                    return {
                        code: 'invalid_theme',
                        message: 'Theme not found',
                        success: false
                    }
                }

                if (theme.skipped) {
                    return {
                        code: 'already_skipped',
                        message: 'This theme is already skipped',
                        success: false
                    }
                }

                const remainingThemes = session.frame.themes.filter(item => !item.skipped).length

                if (remainingThemes <= 1) {
                    return {
                        code: 'cannot_skip_last_theme',
                        message: 'You cannot skip the last remaining theme',
                        success: false
                    }
                }

                const contestants = this.getJeopardyContestants(state)
                const currentSkipperIndex = contestants.findIndex(player => player.id === userId)
                const nextSkipper = contestants.length ? contestants[(currentSkipperIndex + 1 + contestants.length) % contestants.length] : null

                theme.skipped = true

                this.updateJeopardyFrame(state, {
                    ...session.frame,
                    skipperId: nextSkipper?.id || null,
                    themes: [...session.frame.themes]
                })

                const action = this.createSuccessfulGameAction(
                    {
                        id: actor.id,
                        type: 'player'
                    },
                    '$SkipFinalTheme',
                    {
                        themeIndex
                    }
                )

                if (session.frame.themes.filter(item => !item.skipped).length === 1) {
                    await this.beginJeopardyFinalRoundBetting(state)
                }

                return {
                    action,
                    stateChanged: true,
                    success: true
                }
            }
            case '$MakeFinalBet': {
                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'betting') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final betting is not active',
                        success: false
                    }
                }

                if (actor.id === state.creatorUserId || actor.playerScore <= 0) {
                    return {
                        code: 'invalid_bettor',
                        message: 'Only contestants with a positive score can bet',
                        success: false
                    }
                }

                if (session.frame.playersThatMadeBet.includes(userId)) {
                    return {
                        code: 'already_bet',
                        message: 'You already made your bet',
                        success: false
                    }
                }

                const payload = actionPayload as { value?: number } | null
                const value = payload?.value

                if (typeof value !== 'number' || value < 1 || value > actor.playerScore) {
                    return {
                        code: 'invalid_bet',
                        message: 'Bet must be within your score range',
                        success: false
                    }
                }

                session.internal.finalBets[userId] = value
                this.sendJeopardyInternalSessionUpdate(state)

                this.updateJeopardyFrame(state, {
                    ...session.frame,
                    playersThatMadeBet: [...session.frame.playersThatMadeBet, userId]
                })

                const eligibleBetters = this.getJeopardyContestants(state).filter(player => player.playerScore > 0)

                if (session.frame.playersThatMadeBet.length + 1 >= eligibleBetters.length) {
                    await this.beginJeopardyFinalQuestionAnswering(state)
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$GiveFinalAnswer': {
                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'answering') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final answers are not open right now',
                        success: false
                    }
                }

                if (actor.id === state.creatorUserId || actor.playerScore <= 0) {
                    return {
                        code: 'invalid_answerer',
                        message: 'Only contestants with a positive score can answer',
                        success: false
                    }
                }

                if (session.frame.playersThatAnswered.includes(userId)) {
                    return {
                        code: 'already_answered',
                        message: 'You already submitted your final answer',
                        success: false
                    }
                }

                const payload = actionPayload as { answer?: string } | null

                session.internal.finalAnswers[userId] = {
                    value: payload?.answer || ''
                }
                this.sendJeopardyInternalSessionUpdate(state)

                this.updateJeopardyFrame(state, {
                    ...session.frame,
                    playersThatAnswered: [...session.frame.playersThatAnswered, userId]
                })

                const eligibleAnswerers = this.getJeopardyContestants(state).filter(player => player.playerScore > 0)

                if (session.frame.playersThatAnswered.length + 1 >= eligibleAnswerers.length) {
                    this.beginJeopardyFinalQuestionVerifying(state)
                }

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$RateFinalAnswer': {
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can rate final answers',
                        success: false
                    }
                }

                if (session.frame.id !== 'final-round-board' || session.frame.status !== 'answer-verifying') {
                    return {
                        code: 'invalid_frame',
                        message: 'Final answer verification is not active',
                        success: false
                    }
                }

                const payload = actionPayload as { answeringPlayerId?: string; rate?: 'approved' | 'declined' } | null
                const answeringPlayerId = payload?.answeringPlayerId
                const rate = payload?.rate

                if (!answeringPlayerId || !rate) {
                    return {
                        code: 'invalid_payload',
                        message: 'Final answer rating is incomplete',
                        success: false
                    }
                }

                const answer = session.internal.finalAnswers[answeringPlayerId]
                const answeringPlayer = state.members.find(member => member.id === answeringPlayerId && member.role === 'player')

                if (!answer || !answeringPlayer) {
                    return {
                        code: 'answer_not_found',
                        message: 'Final answer not found',
                        success: false
                    }
                }

                answer.rate = rate
                answeringPlayer.playerScore +=
                    rate === 'approved' ? session.internal.finalBets[answeringPlayerId] || 0 : -(session.internal.finalBets[answeringPlayerId] || 0)
                this.sendJeopardyInternalSessionUpdate(state)

                return {
                    stateChanged: true,
                    success: true
                }
            }
            case '$ShowFinalScores':
                if (!isMaster) {
                    return {
                        code: 'forbidden',
                        message: 'Only the Jeopardy master can show final scores',
                        success: false
                    }
                }

                await this.showJeopardyFinalScores(state)

                return {
                    stateChanged: true,
                    success: true
                }
            case '$MediaEnded':
                if (session.frame.id !== 'question-content' || (session.frame.type !== 'video' && session.frame.type !== 'voice')) {
                    return {
                        code: 'invalid_media_state',
                        message: 'There is no active Jeopardy media atom to finish',
                        success: false
                    }
                }

                session.meta.mediaElapsedTimeMs = 0
                session.meta.mediaStartedAt = null
                await this.showNextJeopardyQuestionAtom(state)

                return {
                    stateChanged: true,
                    success: true
                }
            default:
                return {
                    code: 'unsupported_action',
                    message: `Unsupported Jeopardy action: ${actionName}`,
                    success: false
                }
        }
    }

    private async handleClickerClick(
        state: StoredLobbyState,
        userId: string,
        x: number,
        y: number
    ): Promise<
        | {
              success: true
              action: LobbyRoomGameActionMessage
              stateChanged: boolean
          }
        | {
              success: false
              code: string
              message: string
          }
    > {
        if (state.game.name !== 'Clicker') {
            return {
                success: false,
                message: 'This room does not run Clicker',
                code: 'invalid_game'
            }
        }

        const player = state.members.find(member => member.id === userId && member.role === 'player')

        if (!player) {
            return {
                success: false,
                message: 'Only players can click',
                code: 'not_a_player'
            }
        }

        if (state.game.session.status === 'idle') {
            return {
                success: false,
                message: 'There is no active Clicker session',
                code: 'game_not_started'
            }
        }

        const actionPayload = { x, y }

        if (!player.playerIsClickAllowed) {
            return {
                success: true,
                action: this.createGameActionMessage({
                    actor: {
                        id: player.id,
                        type: 'player'
                    },
                    actionName: '$Click',
                    actionPayload,
                    actionResult: {
                        color: player.userColor,
                        status: 'Skipped'
                    }
                }),
                stateChanged: false
            }
        }

        if (!state.game.session.playerIsClickAllowed) {
            player.playerIsClickAllowed = false

            if (state.game.session.id) {
                await this.scheduler.schedule({
                    key: this.getClickerReenablePlayerTaskKey(state.game.session.id, player.id),
                    payload: {
                        sessionId: state.game.session.id,
                        type: 'clicker.reenable-player',
                        userId: player.id
                    },
                    scheduledAt: Date.now() + CLICKER_REENABLE_DELAY_MS
                })
            }

            return {
                success: true,
                action: this.createGameActionMessage({
                    actor: {
                        id: player.id,
                        type: 'player'
                    },
                    actionName: '$Click',
                    actionPayload,
                    actionResult: {
                        color: player.userColor,
                        status: 'Failure'
                    }
                }),
                stateChanged: true
            }
        }

        if (state.game.session.winnerUserId) {
            return {
                success: true,
                action: this.createGameActionMessage({
                    actor: {
                        id: player.id,
                        type: 'player'
                    },
                    actionName: '$Click',
                    actionPayload,
                    actionResult: {
                        color: player.userColor,
                        status: 'NotWin'
                    }
                }),
                stateChanged: false
            }
        }

        state.game.session.status = 'resolving'
        state.game.session.winnerUserId = player.id

        if (state.game.session.id) {
            await this.scheduler.schedule({
                key: this.getClickerCompleteSessionTaskKey(state.game.session.id),
                payload: {
                    sessionId: state.game.session.id,
                    type: 'clicker.complete-session',
                    winnerUserId: player.id
                },
                scheduledAt: Date.now() + CLICKER_COMPLETE_DELAY_MS
            })
        }

        return {
            success: true,
            action: this.createGameActionMessage({
                actor: {
                    id: player.id,
                    type: 'player'
                },
                actionName: '$Click',
                actionPayload,
                actionResult: {
                    color: player.userColor,
                    status: 'Ok'
                }
            }),
            stateChanged: true
        }
    }

    private makeMove(
        state: StoredLobbyState,
        userId: string,
        cell: [number, number]
    ): { success: true; finalizedSession?: FinalizeRoomSessionInput } | { success: false; message: string; code: string } {
        if (state.game.name !== 'TicTacToe') {
            return {
                success: false,
                message: 'This room does not run TicTacToe',
                code: 'invalid_game'
            }
        }

        const player = state.members.find(member => member.id === userId && member.role === 'player')

        if (!player) {
            return {
                success: false,
                message: 'Only players can make moves',
                code: 'not_a_player'
            }
        }

        if (state.game.session.status !== 'active') {
            return {
                success: false,
                message: 'There is no active game',
                code: 'game_not_started'
            }
        }

        if (state.game.session.turnUserId !== userId) {
            return {
                success: false,
                message: 'It is not your turn',
                code: 'not_your_turn'
            }
        }

        const [row, column] = cell

        if (row < 0 || row > 2 || column < 0 || column > 2) {
            return {
                success: false,
                message: 'Invalid board cell',
                code: 'invalid_cell'
            }
        }

        if (state.game.session.board[row][column] !== null) {
            return {
                success: false,
                message: 'Cell is already taken',
                code: 'cell_taken'
            }
        }

        if (!player.playerChar) {
            return {
                success: false,
                message: 'Player piece is missing',
                code: 'player_char_missing'
            }
        }

        state.game.session.board[row][column] = player.playerChar

        const winningLine = findWinningLine(state.game.session.board)

        if (winningLine) {
            const winner = state.members.find(member => member.playerChar === winningLine.winner)

            state.game.session.status = 'finished'
            state.game.session.winnerUserId = winner?.id || null
            state.game.session.winLine = winningLine.line
            state.game.session.turnUserId = null
            state.game.session.endedAt = nowIso()
            state.game.session.isDraw = false

            return {
                finalizedSession: this.createCompletedTicTacToeRoomSessionRecord(state) || undefined,
                success: true
            }
        }

        if (isBoardFull(state.game.session.board)) {
            state.game.session.status = 'finished'
            state.game.session.winnerUserId = null
            state.game.session.winLine = null
            state.game.session.turnUserId = null
            state.game.session.endedAt = nowIso()
            state.game.session.isDraw = true

            return {
                finalizedSession: this.createCompletedTicTacToeRoomSessionRecord(state) || undefined,
                success: true
            }
        }

        const nextPlayer = state.members.find(member => member.role === 'player' && member.id !== userId)

        state.game.session.turnUserId = nextPlayer?.id || null

        return {
            success: true
        }
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
                return this.handleClickerAllowClickTask(state, task.sessionId)
            case 'clicker.reenable-player':
                return this.handleClickerReenablePlayerTask(state, task.sessionId, task.userId)
            case 'clicker.complete-session':
                return this.handleClickerCompleteSessionTask(state, task.sessionId, task.winnerUserId)
            case 'jeopardy.pack-preview.complete':
                return this.handleJeopardyPackPreviewCompleteTask(state, task.sessionId)
            case 'jeopardy.round-preview.theme':
                return this.handleJeopardyRoundPreviewThemeTask(state, task.sessionId, task.roundId, task.themeIndex)
            case 'jeopardy.round-preview.complete':
                return this.handleJeopardyRoundPreviewCompleteTask(state, task.sessionId, task.roundId)
            case 'jeopardy.pick-question.complete':
                return this.handleJeopardyPickQuestionCompleteTask(state, task.sessionId, task.questionId)
            case 'jeopardy.question.atom.complete':
                return this.handleJeopardyQuestionAtomCompleteTask(state, task.sessionId)
            case 'jeopardy.answer-request.complete':
                return this.handleJeopardyAnswerRequestCompleteTask(state, task.sessionId)
            case 'jeopardy.answer-giving.complete':
                return this.handleJeopardyAnswerGivingCompleteTask(state, task.sessionId)
            case 'jeopardy.answer-verifying.complete':
                return this.handleJeopardyAnswerVerifyingCompleteTask(state, task.sessionId)
            case 'jeopardy.cooldown.complete':
                return this.handleJeopardyCooldownCompleteTask(state, task.sessionId, task.userId)
        }
    }

    private handleClickerAllowClickTask(state: StoredLobbyState, sessionId: string): ScheduledTaskResult {
        if (state.game.name !== 'Clicker' || state.game.session.id !== sessionId || state.game.session.status !== 'waiting') {
            return {
                stateChanged: false
            }
        }

        state.game.session.playerIsClickAllowed = true
        state.game.session.status = 'active'

        return {
            action: this.createGameActionMessage({
                actor: {
                    id: 'game',
                    type: 'game'
                },
                actionName: '$ClickAllowed',
                actionPayload: {},
                actionResult: {
                    playerIsClickAllowed: true
                }
            }),
            stateChanged: true
        }
    }

    private handleClickerReenablePlayerTask(state: StoredLobbyState, sessionId: string, userId: string): ScheduledTaskResult {
        if (state.game.name !== 'Clicker' || state.game.session.id !== sessionId || state.game.session.status === 'idle') {
            return {
                stateChanged: false
            }
        }

        const player = state.members.find(member => member.id === userId && member.role === 'player')

        if (!player || player.playerIsClickAllowed) {
            return {
                stateChanged: false
            }
        }

        player.playerIsClickAllowed = true

        return {
            stateChanged: true
        }
    }

    private handleClickerCompleteSessionTask(state: StoredLobbyState, sessionId: string, winnerUserId: string): ScheduledTaskResult {
        if (state.game.name !== 'Clicker' || state.game.session.id !== sessionId || state.game.session.status !== 'resolving') {
            return {
                stateChanged: false
            }
        }

        state.members
            .filter(member => member.role === 'player')
            .forEach(member => {
                member.playerIsClickAllowed = true
            })

        const winner = state.members.find(member => member.id === winnerUserId && member.role === 'player')

        if (winner) {
            winner.playerScore += 1
        }

        const finalizedSession = this.createCompletedClickerRoomSessionRecord(state, sessionId, winnerUserId)
        state.game.session = createIdleClickerSession()

        return {
            finalizedSession,
            stateChanged: true
        }
    }

    private async handleJeopardyPackPreviewCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId) {
            return {
                stateChanged: false
            }
        }

        await this.beginJeopardyRoundPreview(state, state.game.session?.internal.currentRoundId || 0)

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyRoundPreviewThemeTask(
        state: StoredLobbyState,
        sessionId: string,
        roundId: number,
        themeIndex: number
    ): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        const round = getRoundThemeNames(state.game.packDeclaration, roundId)

        if (!round || state.game.session.frame.id !== 'rounds-preview') {
            return {
                stateChanged: false
            }
        }

        const themeName = round.themeNames[themeIndex]

        if (!themeName) {
            return {
                stateChanged: false
            }
        }

        this.updateJeopardyFrame(state, {
            id: 'rounds-preview',
            isRoundName: false,
            text: themeName
        })

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyRoundPreviewCompleteTask(state: StoredLobbyState, sessionId: string, roundId: number): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        if (isFinalRound(state.game.packDeclaration, roundId)) {
            await this.showJeopardyFinalRoundBoard(state)
        } else {
            this.showJeopardyQuestionBoard(state, roundId)
        }

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyPickQuestionCompleteTask(
        state: StoredLobbyState,
        sessionId: string,
        questionId: RealtimeJeopardyQuestionId
    ): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId) {
            return {
                stateChanged: false
            }
        }

        await this.beginJeopardyQuestion(state, questionId)

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyQuestionAtomCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId) {
            return {
                stateChanged: false
            }
        }

        await this.showNextJeopardyQuestionAtom(state)

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyAnswerRequestCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        const session = state.game.session

        if (session.frame.id !== 'question-content') {
            return {
                stateChanged: false
            }
        }

        this.updateJeopardyFrame(state, {
            ...session.frame,
            answeringStatus: 'too-late',
            answerRequestStartedAt: null,
            answerRequestEndsAt: null,
            answerRequestTimeLeft: null
        })

        session.meta.answerRequestRemainingMs = null
        session.meta.currentQuestionFlow = session.meta.currentQuestionFlow
            ? {
                  ...session.meta.currentQuestionFlow,
                  shownAtomIndex: -1,
                  stage: 'after'
              }
            : null

        await this.showNextJeopardyQuestionAtom(state)

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyAnswerGivingCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        if (state.game.session.frame.id !== 'question-content') {
            return {
                stateChanged: false
            }
        }

        this.updateJeopardyInternal(state, {
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: state.game.session.frame.answeringPlayerId
        })

        await this.beginJeopardyAnswerVerifying(state)

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyAnswerVerifyingCompleteTask(state: StoredLobbyState, sessionId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        const session = state.game.session

        if (session.frame.id !== 'question-content') {
            return {
                stateChanged: false
            }
        }

        const currentAnsweringPlayerId = session.internal.currentAnsweringPlayerId
        const question = getJeopardyQuestionById(state.game.packDeclaration, session.frame.questionId)

        if (currentAnsweringPlayerId && question) {
            const answeringPlayer = state.members.find(member => member.id === currentAnsweringPlayerId && member.role === 'player')

            if (answeringPlayer) {
                answeringPlayer.playerScore -= parseInt(question._attributes.price, 10)
            }
        }

        this.updateJeopardyInternal(state, {
            correctAnswers: null,
            currentAnsweringPlayerAnswerText: null,
            currentAnsweringPlayerId: null,
            incorrectAnswers: null
        })

        await this.continueJeopardyQuestionAfterAnswerResolution(state, false)

        return {
            stateChanged: true
        }
    }

    private async handleJeopardyCooldownCompleteTask(state: StoredLobbyState, sessionId: string, userId: string): Promise<ScheduledTaskResult> {
        if (state.game.name !== 'Jeopardy' || this.getActiveJeopardyRoomSessionId(state) !== sessionId || !state.game.session) {
            return {
                stateChanged: false
            }
        }

        if (state.game.session.frame.id !== 'question-content' || !state.game.session.frame.playersOnCooldown.includes(userId)) {
            return {
                stateChanged: false
            }
        }

        this.updateJeopardyFrame(state, {
            ...state.game.session.frame,
            playersOnCooldown: state.game.session.frame.playersOnCooldown.filter(playerId => playerId !== userId)
        })

        return {
            stateChanged: true
        }
    }

    private createGameActionMessage(message: LobbyRoomGameActionMessage['payload']): LobbyRoomGameActionMessage {
        return {
            type: 'game.action',
            payload: message
        }
    }

    private getClickerSessionTaskPrefix(sessionId: string): string {
        return `clicker:${sessionId}:`
    }

    private getClickerAllowClickTaskKey(sessionId: string): string {
        return `${this.getClickerSessionTaskPrefix(sessionId)}allow-click`
    }

    private getClickerReenablePlayerTaskKey(sessionId: string, userId: string): string {
        return `${this.getClickerSessionTaskPrefix(sessionId)}reenable-player:${userId}`
    }

    private getClickerCompleteSessionTaskKey(sessionId: string): string {
        return `${this.getClickerSessionTaskPrefix(sessionId)}complete-session`
    }

    private async cancelClickerSessionTasks(sessionId: string): Promise<void> {
        await this.scheduler.cancelByPrefix(this.getClickerSessionTaskPrefix(sessionId))
    }

    private async handleRemovedPlayerSideEffects(state: StoredLobbyState, removalReason: 'player_kicked' | 'player_left'): Promise<void> {
        if (state.game.name === 'TicTacToe' && state.game.session.status === 'active') {
            await this.persistFinalizedRoomSession(this.createAbandonedRoomSessionRecord(state, removalReason))
            state.game.session = createIdleTicTacToeSession()
            return
        }

        if (state.game.name === 'Jeopardy' && state.game.session) {
            const publicSession = this.toPublicJeopardySession(state.game.session)
            const sessionId = this.getActiveJeopardyRoomSessionId(state)

            if (sessionId) {
                await this.cancelJeopardySessionTasks(sessionId)
            }

            await this.persistFinalizedRoomSession(this.createAbandonedRoomSessionRecord(state, removalReason))
            state.game.session = null
            this.broadcastJeopardySessionEnd(state, publicSession)
            return
        }

        if (state.game.name !== 'Clicker' || state.game.session.status === 'idle') {
            return
        }

        const activePlayersLeft = state.members.some(item => item.role === 'player')

        if (!activePlayersLeft) {
            const sessionId = state.game.session.id
            const abandonedSession = this.createAbandonedRoomSessionRecord(state, removalReason === 'player_kicked' ? 'all_players_kicked' : 'all_players_left')

            state.game.session = createIdleClickerSession()

            if (sessionId) {
                await this.cancelClickerSessionTasks(sessionId)
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

    private createCompletedTicTacToeRoomSessionRecord(state: StoredLobbyState): FinalizeRoomSessionInput | null {
        if (state.game.name !== 'TicTacToe' || state.game.session.status !== 'finished' || !state.game.session.id) {
            return null
        }

        const session = state.game.session

        if (!session.id) {
            return null
        }

        const winner = state.members.find(member => member.id === session.winnerUserId)

        return {
            endedAt: session.endedAt || nowIso(),
            id: session.id,
            resultSummary: {
                board: session.board.map(row => [...row]),
                isDraw: session.isDraw,
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        id: member.id,
                        playerChar: member.playerChar,
                        userNickname: member.userNickname
                    })),
                winLine: session.winLine ? [...session.winLine] : null
            },
            status: 'completed',
            winnerNickname: winner?.userNickname || null,
            winnerUserId: winner?.id || null
        }
    }

    private createCompletedClickerRoomSessionRecord(state: StoredLobbyState, sessionId: string, winnerUserId: string): FinalizeRoomSessionInput {
        const winner = state.members.find(member => member.id === winnerUserId && member.role === 'player')

        return {
            endedAt: nowIso(),
            id: sessionId,
            resultSummary: {
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        id: member.id,
                        playerScore: member.playerScore,
                        userNickname: member.userNickname
                    }))
            },
            status: 'completed',
            winnerNickname: winner?.userNickname || null,
            winnerUserId: winner?.id || null
        }
    }

    private createCompletedJeopardyRoomSessionRecord(state: StoredLobbyState): FinalizeRoomSessionInput | null {
        if (state.game.name !== 'Jeopardy' || !state.game.session) {
            return null
        }

        const sessionId = this.getActiveJeopardyRoomSessionId(state)

        if (!sessionId) {
            return null
        }

        const winner =
            state.members
                .filter(member => member.role === 'player')
                .reduce(
                    (previous, current) => (previous && previous.playerScore >= current.playerScore ? previous : current),
                    null as StoredLobbyMember | null
                ) || null

        return {
            endedAt: nowIso(),
            id: sessionId,
            resultSummary: {
                answeredQuestions: [...state.game.session.internal.answeredQuestions],
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        id: member.id,
                        playerIsMaster: member.isCreator,
                        playerScore: member.playerScore,
                        userNickname: member.userNickname
                    }))
            },
            status: 'completed',
            winnerNickname: winner?.userNickname || null,
            winnerUserId: winner?.id || null
        }
    }

    private createAbandonedRoomSessionRecord(state: StoredLobbyState, reason: string): FinalizeRoomSessionInput | null {
        if (state.game.name === 'TicTacToe') {
            if (state.game.session.status !== 'active' || !state.game.session.id) {
                return null
            }

            return {
                endedAt: nowIso(),
                id: state.game.session.id,
                resultSummary: {
                    board: state.game.session.board.map(row => [...row]),
                    players: state.members
                        .filter(member => member.role === 'player')
                        .map(member => ({
                            id: member.id,
                            playerChar: member.playerChar,
                            userNickname: member.userNickname
                        })),
                    reason
                },
                status: 'abandoned'
            }
        }

        if (state.game.name === 'Jeopardy') {
            const sessionId = this.getActiveJeopardyRoomSessionId(state)

            if (!state.game.session || !sessionId) {
                return null
            }

            return {
                endedAt: nowIso(),
                id: sessionId,
                resultSummary: {
                    answeredQuestions: [...state.game.session.internal.answeredQuestions],
                    players: state.members
                        .filter(member => member.role === 'player')
                        .map(member => ({
                            id: member.id,
                            playerIsMaster: member.isCreator,
                            playerScore: member.playerScore,
                            userNickname: member.userNickname
                        })),
                    reason
                },
                status: 'abandoned'
            }
        }

        if (state.game.session.status === 'idle' || !state.game.session.id) {
            return null
        }

        return {
            endedAt: nowIso(),
            id: state.game.session.id,
            resultSummary: {
                players: state.members
                    .filter(member => member.role === 'player')
                    .map(member => ({
                        id: member.id,
                        playerScore: member.playerScore,
                        userNickname: member.userNickname
                    })),
                reason
            },
            status: 'abandoned'
        }
    }

    private refreshStoredMember(member: StoredLobbyMember, profile: IdentityProfile): void {
        member.userNickname = profile.userNickname
        member.userColor = profile.userColor
        member.userAvatarUrl = profile.userAvatarUrl
    }

    private normalizePlayerAssignments(state: StoredLobbyState): void {
        const orderedPlayers = state.members.filter(member => member.role === 'player').sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))

        state.members.forEach(member => {
            member.playerScore = member.playerScore || 0
            member.playerIsClickAllowed = member.role === 'player' ? member.playerIsClickAllowed : true
        })

        if (state.game.name === 'TicTacToe') {
            orderedPlayers.forEach((member, index) => {
                member.playerChar = index === 0 ? 'x' : 'o'
            })

            state.members
                .filter(member => member.role !== 'player')
                .forEach(member => {
                    member.playerChar = null
                })

            return
        }

        state.members.forEach(member => {
            member.playerChar = null

            if (member.role !== 'player') {
                member.playerIsClickAllowed = true
            }
        })
    }

    private resetReadyCheck(state: StoredLobbyState): void {
        state.members.forEach(member => {
            member.ready = null
        })

        state.readyCheck = {
            participants: [],
            status: 'idle',
            updatedAt: nowIso()
        }
    }
}
