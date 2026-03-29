import type { IdentityProfile } from './identity'
import type { LobbyBaseInfo } from './lobby'

export type RealtimeLobbyGameName = 'TicTacToe' | 'Clicker'
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

export type RealtimeLobbyGame = RealtimeTicTacToeGame | RealtimeClickerGame

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

export interface LobbyRoomPingMessage {
    type: 'ping'
}

export type LobbyRoomClientMessage =
    | LobbyRoomChatSendMessage
    | LobbyRoomClickerClickMessage
    | LobbyRoomGameStartMessage
    | LobbyRoomJoinMessage
    | LobbyRoomLeaveMessage
    | LobbyRoomPingMessage
    | LobbyRoomReadySetMessage
    | LobbyRoomReadyStartMessage
    | LobbyRoomSyncMessage
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

export type LobbyRoomServerMessage =
    | LobbyRoomErrorMessage
    | LobbyRoomGameActionMessage
    | LobbyRoomNoticeMessage
    | LobbyRoomPongMessage
    | LobbyRoomSnapshotMessage
