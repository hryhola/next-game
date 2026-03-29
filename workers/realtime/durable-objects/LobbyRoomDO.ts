import { DurableObject } from 'cloudflare:workers'
import type {
    CreateLobbyRequest,
    LobbyRoomClientMessage,
    LobbyRoomServerMessage,
    RealtimeLobbyListItem,
    RealtimeLobbyMemberRole,
    RealtimeLobbySnapshot,
    TicTacToePlayerChar
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'
import { json } from '../lib/json'
import { markLobbyDeleted, upsertLobbyMetadata } from '../lobbies/store'
import { createEmptyBoard, findWinningLine, isBoardFull } from '../lobbies/tictactoe'
import type { ComputedLobbySnapshot, RoomSocketAttachment, StoredLobbyMember, StoredLobbyState } from '../lobbies/types'
import type { RealtimeWorkerEnv } from '../types'

function nowIso(): string {
    return new Date().toISOString()
}

function createIdleSession() {
    return {
        board: createEmptyBoard(),
        endedAt: null,
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

export class LobbyRoomDO extends DurableObject<RealtimeWorkerEnv> {
    constructor(ctx: DurableObjectState, env: RealtimeWorkerEnv) {
        super(ctx, env)

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
                gameStatus: state.game.session.status
            })
        }

        if (url.pathname === '/state') {
            return this.handleState()
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

                await this.persistState(state)
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

                await this.persistState(state)
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
                const gameStartResult = this.startGame(state, attachment.user.id)

                if (!gameStartResult.success) {
                    this.sendError(ws, gameStartResult.message, gameStartResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
                return
            }
            case 'tictactoe.move': {
                const moveResult = this.makeMove(state, attachment.user.id, request.payload.cell)

                if (!moveResult.success) {
                    this.sendError(ws, moveResult.message, moveResult.code)
                    return
                }

                await this.persistState(state)
                this.broadcastSnapshot(state)
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

        const creatorMember: StoredLobbyMember = {
            ...identity.user,
            isCreator: true,
            joinedAt: createdAt,
            playerChar: 'x',
            ready: null,
            role: 'player'
        }

        const state: StoredLobbyState = {
            chat: [],
            createdAt,
            creatorUserId: identity.user.id,
            game: {
                name: 'TicTacToe',
                session: createIdleSession()
            },
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

        await this.persistState(state)

        return json({
            ok: true,
            room: this.buildSnapshot(state)
        })
    }

    private async handleState(): Promise<Response> {
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

        await this.destroyRoom(roomId)

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
        this.broadcastSnapshot(state)

        return new Response(null, {
            status: 101,
            webSocket: client
        } as ResponseInit & { webSocket: WebSocket })
    }

    private async getState(): Promise<StoredLobbyState | null> {
        return (await this.ctx.storage.get<StoredLobbyState>('state')) || null
    }

    private async persistState(state: StoredLobbyState): Promise<void> {
        state.updatedAt = nowIso()
        await this.ctx.storage.put('state', state)
        await this.syncLobbyMetadata(state)
    }

    private async destroyRoom(roomId: string): Promise<void> {
        const deletedAt = nowIso()

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
            status: state.game.session.status === 'active' ? 'in_progress' : 'waiting',
            updatedAt: state.updatedAt
        }

        await upsertLobbyMetadata(this.env.IDENTITY_DB, item)
    }

    private buildSnapshot(state: StoredLobbyState): ComputedLobbySnapshot {
        return {
            chat: [...state.chat],
            createdAt: state.createdAt,
            creatorUserId: state.creatorUserId,
            game: {
                name: state.game.name,
                session: {
                    ...state.game.session,
                    board: state.game.session.board.map(row => [...row]),
                    winLine: state.game.session.winLine ? [...state.game.session.winLine] : null
                }
            },
            hasPassword: Boolean(state.password),
            members: state.members
                .map(member => ({
                    ...member,
                    connected: this.ctx.getWebSockets(userTag(member.id)).length > 0,
                    playerChar: member.playerChar || undefined
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
        const payload = JSON.stringify({
            type: 'room.snapshot',
            payload: this.buildSnapshot(state)
        } as LobbyRoomServerMessage)

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

        if (existingMember) {
            if (existingMember.role === role) {
                this.refreshStoredMember(existingMember, user)
                return {
                    success: true,
                    message: `${user.userNickname} rejoined the room`
                }
            }

            if (state.game.session.status === 'active') {
                return {
                    success: false,
                    message: 'Cannot change roles during an active game',
                    code: 'game_in_progress'
                }
            }

            if (role === 'player' && state.members.filter(member => member.role === 'player' && member.id !== user.id).length >= 2) {
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

        if (role === 'player' && state.members.filter(member => member.role === 'player').length >= 2) {
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
            playerChar: role === 'player' ? null : null,
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
            await this.destroyRoom(state.roomId)
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

        if (member.role === 'player' && state.game.session.status === 'active') {
            state.game.session = createIdleSession()
        }

        this.normalizePlayerAssignments(state)
        this.resetReadyCheck(state)

        return {
            success: true,
            message: `${member.userNickname} left the room`
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

        if (state.game.session.status === 'active') {
            return {
                success: false,
                message: 'Cannot start a ready check during an active game',
                code: 'game_in_progress'
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

    private startGame(state: StoredLobbyState, userId: string): { success: true } | { success: false; message: string; code: string } {
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

        state.game.session = {
            board: createEmptyBoard(),
            endedAt: null,
            isDraw: false,
            startedAt: nowIso(),
            status: 'active',
            turnUserId: orderedPlayers[0].id,
            winLine: null,
            winnerUserId: null
        }

        state.readyCheck = {
            participants: [],
            status: 'idle',
            updatedAt: nowIso()
        }

        return {
            success: true
        }
    }

    private makeMove(state: StoredLobbyState, userId: string, cell: [number, number]): { success: true } | { success: false; message: string; code: string } {
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
                success: true
            }
        }

        const nextPlayer = state.members.find(member => member.role === 'player' && member.id !== userId)

        state.game.session.turnUserId = nextPlayer?.id || null

        return {
            success: true
        }
    }

    private refreshStoredMember(member: StoredLobbyMember, profile: IdentityProfile): void {
        member.userNickname = profile.userNickname
        member.userColor = profile.userColor
        member.userAvatarUrl = profile.userAvatarUrl
    }

    private normalizePlayerAssignments(state: StoredLobbyState): void {
        const orderedPlayers = state.members.filter(member => member.role === 'player').sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))

        orderedPlayers.forEach((member, index) => {
            member.playerChar = index === 0 ? 'x' : 'o'
        })

        state.members
            .filter(member => member.role !== 'player')
            .forEach(member => {
                member.playerChar = null
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
