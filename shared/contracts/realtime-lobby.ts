import type { IdentityProfile } from './identity'
import type { JeopardyDeclaration, RealtimeJeopardyPublicSession } from './jeopardy'
import type { LobbyBaseInfo } from './lobby'

export type RealtimeLobbyGameName = 'TicTacToe' | 'Clicker' | 'Jeopardy'
export type RealtimeLobbyMemberRole = 'player' | 'spectator'
export type RealtimeLobbyStatus = 'waiting' | 'in_progress'
export type ReadyCheckStatus = 'idle' | 'active' | 'success' | 'failed'
export type TicTacToeCellValue = 'x' | 'o' | null
export type TicTacToePlayerChar = Exclude<TicTacToeCellValue, null>
export type TicTacToeCellCoords = [number, number]
export type ClickerSessionStatus = 'idle' | 'waiting' | 'active' | 'resolving'

export interface RealtimeChatMessage {
    id: string
    from: string
    fromColor?: string
    fromUserId: string
    text: string
    createdAt: string
}

export interface RealtimeLobbyMember extends IdentityProfile {
    connected: boolean
    isCreator: boolean
    joinedAt: string
    playerChar?: TicTacToePlayerChar
    playerIsClickAllowed?: boolean
    playerIsMaster?: boolean
    playerScore?: number
    ready: boolean | null
    role: RealtimeLobbyMemberRole
}

export interface RealtimeReadyCheckState {
    participants: string[]
    status: ReadyCheckStatus
    updatedAt: string | null
}

export interface RealtimeTicTacToeSession {
    board: TicTacToeCellValue[][]
    endedAt: string | null
    id: string | null
    isDraw: boolean
    startedAt: string | null
    status: 'idle' | 'active' | 'finished'
    turnUserId: string | null
    winLine: TicTacToeCellCoords[] | null
    winnerUserId: string | null
}

export interface RealtimeClickerSession {
    endedAt: string | null
    id: string | null
    playerIsClickAllowed: boolean
    startedAt: string | null
    status: ClickerSessionStatus
    winnerUserId: string | null
}

export interface RealtimeTicTacToeGame {
    name: 'TicTacToe'
    session: RealtimeTicTacToeSession
}

export interface RealtimeClickerGame {
    initialData: {
        backgroundUrl?: string
    }
    name: 'Clicker'
    session: RealtimeClickerSession
}

export interface RealtimeJeopardyGame {
    initialData: {
        pack: {
            public: true
            value: string
        }
    }
    name: 'Jeopardy'
    session: RealtimeJeopardyPublicSession | null
}

export type RealtimeLobbyGame = RealtimeTicTacToeGame | RealtimeClickerGame | RealtimeJeopardyGame

export interface RealtimeLobbySnapshot {
    chat: RealtimeChatMessage[]
    createdAt: string
    creatorUserId: string
    game: RealtimeLobbyGame
    hasPassword: boolean
    members: RealtimeLobbyMember[]
    name: string
    readyCheck: RealtimeReadyCheckState
    roomId: string
    updatedAt: string
}

export interface RealtimeLobbyListItem extends LobbyBaseInfo {
    createdAt: string
    creatorNickname: string
    creatorUserId: string
    gameName: RealtimeLobbyGameName
    membersCount: number
    name: string
    playersCount: number
    status: RealtimeLobbyStatus
    updatedAt: string
}

export interface CreateLobbyRequest {
    gameName?: RealtimeLobbyGameName
    initialData?: {
        pack?: {
            assetId: string
            author: string
            dateCreated: string
            declaration: JeopardyDeclaration.Pack
            fileName: string
            value: string
        }
    }
    name?: string
    password?: string
    roomId: string
}

export interface LobbyRoomJoinMessage {
    payload: {
        password?: string
        role: RealtimeLobbyMemberRole
    }
    type: 'room.join'
}

export interface LobbyRoomLeaveMessage {
    type: 'room.leave'
}

export interface LobbyRoomSyncMessage {
    type: 'room.sync'
}

export interface LobbyRoomChatSendMessage {
    payload: {
        text: string
    }
    type: 'chat.send'
}

export interface LobbyRoomReadyStartMessage {
    type: 'ready.start'
}

export interface LobbyRoomReadySetMessage {
    payload: {
        ready: boolean
    }
    type: 'ready.set'
}

export interface LobbyRoomGameStartMessage {
    type: 'game.start'
}

export interface LobbyRoomTicTacToeMoveMessage {
    payload: {
        cell: TicTacToeCellCoords
    }
    type: 'tictactoe.move'
}

export interface LobbyRoomClickerClickMessage {
    payload: {
        x: number
        y: number
    }
    type: 'clicker.click'
}

export interface LobbyRoomJeopardyActionMessage {
    payload: {
        actionName: string
        actionPayload: unknown
    }
    type: 'jeopardy.action'
}

export interface LobbyRoomTipClientMessage {
    payload: {
        id: string
        toUserId: string
    }
    type: 'room.tip'
}

export interface LobbyRoomKickClientMessage {
    payload: {
        userId: string
    }
    type: 'room.kick'
}

export interface LobbyRoomPingMessage {
    type: 'ping'
}

export type LobbyRoomClientMessage =
    | LobbyRoomChatSendMessage
    | LobbyRoomClickerClickMessage
    | LobbyRoomGameStartMessage
    | LobbyRoomJeopardyActionMessage
    | LobbyRoomJoinMessage
    | LobbyRoomKickClientMessage
    | LobbyRoomLeaveMessage
    | LobbyRoomPingMessage
    | LobbyRoomReadySetMessage
    | LobbyRoomReadyStartMessage
    | LobbyRoomSyncMessage
    | LobbyRoomTipClientMessage
    | LobbyRoomTicTacToeMoveMessage

export interface LobbyRoomSnapshotMessage {
    payload: RealtimeLobbySnapshot
    type: 'room.snapshot'
}

export interface LobbyRoomErrorMessage {
    payload: {
        code?: string
        message: string
    }
    type: 'room.error'
}

export interface LobbyRoomNoticeMessage {
    payload: {
        message: string
    }
    type: 'room.notice'
}

export interface LobbyRoomPongMessage {
    type: 'pong'
}

export interface LobbyRoomGameActionMessage {
    payload: {
        actionName: string
        actionPayload: unknown
        actionResult: unknown
        actor: {
            id: string
            type: 'game' | 'player'
        }
    }
    type: 'game.action'
}

export interface LobbyRoomGameSessionStartMessage {
    payload: {
        session: unknown
    }
    type: 'game.session.start'
}

export interface LobbyRoomGameSessionUpdateMessage {
    payload: {
        data: unknown
    }
    type: 'game.session.update'
}

export interface LobbyRoomGameSessionEndMessage {
    payload: {
        players: unknown[]
        session: unknown
    }
    type: 'game.session.end'
}

export interface LobbyRoomTipServerMessage {
    payload: {
        from: string
        id: string
        lobbyId: string
        to: string
    }
    type: 'room.tip'
}

export interface LobbyRoomKickServerMessage {
    payload: {
        memberId: string
    }
    type: 'room.kick'
}

export type LobbyRoomServerMessage =
    | LobbyRoomErrorMessage
    | LobbyRoomGameActionMessage
    | LobbyRoomGameSessionEndMessage
    | LobbyRoomGameSessionStartMessage
    | LobbyRoomGameSessionUpdateMessage
    | LobbyRoomKickServerMessage
    | LobbyRoomNoticeMessage
    | LobbyRoomPongMessage
    | LobbyRoomSnapshotMessage
    | LobbyRoomTipServerMessage
