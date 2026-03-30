import type { IdentityProfile } from './identity'
import type { JeopardyDeclaration, RealtimeJeopardyPublicSession, RealtimeJeopardySessionInternal } from './jeopardy'
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
    role: RealtimeLobbyMemberRole
}

export interface RealtimeReadyCheckState {
    participants: string[]
    status: ReadyCheckStatus
    updatedAt: string | null
    votes: Record<string, boolean | null>
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

export interface RealtimeTicTacToeParticipantView {
    memberId: string
    seat: TicTacToePlayerChar
}

export interface RealtimeClickerParticipantView {
    isClickAllowed: boolean
    memberId: string
    score: number
}

export interface RealtimeJeopardyParticipantView {
    isMaster: boolean
    memberId: string
    score: number
}

export type LobbyGameParticipantView = RealtimeClickerParticipantView | RealtimeJeopardyParticipantView | RealtimeTicTacToeParticipantView

export type LobbyGameSessionView = RealtimeClickerSession | RealtimeJeopardyPublicSession | RealtimeTicTacToeSession | null

export interface RealtimeTicTacToeGameConfig {
    [key: string]: never
}

export interface RealtimeClickerGameConfig {
    backgroundUrl?: string
}

export interface RealtimeJeopardyGameConfig {
    pack: {
        public: true
        value: string
    }
}

export type LobbyGameConfigInput = RealtimeClickerGameConfig | RealtimeJeopardyGameConfig | RealtimeTicTacToeGameConfig

export interface RealtimeTicTacToeGameView {
    config: RealtimeTicTacToeGameConfig
    kind: 'TicTacToe'
    name: 'TicTacToe'
    participants: RealtimeTicTacToeParticipantView[]
    session: RealtimeTicTacToeSession | null
    status: RealtimeLobbyStatus
}

export interface RealtimeClickerGameView {
    config: RealtimeClickerGameConfig
    kind: 'Clicker'
    name: 'Clicker'
    participants: RealtimeClickerParticipantView[]
    session: RealtimeClickerSession | null
    status: RealtimeLobbyStatus
}

export interface RealtimeJeopardyGameView {
    config: RealtimeJeopardyGameConfig
    internal?: RealtimeJeopardySessionInternal
    kind: 'Jeopardy'
    name: 'Jeopardy'
    participants: RealtimeJeopardyParticipantView[]
    session: RealtimeJeopardyPublicSession | null
    status: RealtimeLobbyStatus
}

export type LobbyGameView = RealtimeClickerGameView | RealtimeJeopardyGameView | RealtimeTicTacToeGameView
export type RealtimeTicTacToeGame = RealtimeTicTacToeGameView
export type RealtimeClickerGame = RealtimeClickerGameView
export type RealtimeJeopardyGame = RealtimeJeopardyGameView
export type RealtimeLobbyGame = LobbyGameView

export interface RealtimeLobbyState {
    chat: RealtimeChatMessage[]
    createdAt: string
    creatorUserId: string
    game: LobbyGameView
    hasPassword: boolean
    members: RealtimeLobbyMember[]
    name: string
    readyCheck: RealtimeReadyCheckState
    lobbyId: string
    updatedAt: string
    version: 2
}

export type RealtimeLobbySnapshot = RealtimeLobbyState

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

export interface CreateLobbyGameRequest {
    config: LobbyGameConfigInput
    kind: RealtimeLobbyGameName
}

export interface CreateLobbyRequestV2 {
    game: CreateLobbyGameRequest
    name?: string
    password?: string
    lobbyId: string
}

export type CreateLobbyRequest = CreateLobbyRequestV2

export type LobbyCommandName = 'join' | 'leave' | 'tip' | 'kick' | 'chat.send' | 'ready.start' | 'ready.set' | 'game.start'

export interface LobbyCommandMessage {
    payload: {
        commandName: LobbyCommandName
        commandPayload?: unknown
    }
    type: 'lobby.command'
}

export interface LobbyGameCommandMessage {
    payload: {
        commandName: string
        commandPayload?: unknown
    }
    type: 'game.command'
}

export interface LobbyPingMessage {
    type: 'ping'
}

export interface LobbySyncMessage {
    type: 'lobby.sync'
}

export type LobbyClientMessage = LobbyPingMessage | LobbySyncMessage | LobbyCommandMessage | LobbyGameCommandMessage

export interface LobbyStateMessage {
    payload: RealtimeLobbyState
    type: 'lobby.state'
}

export interface LobbyErrorMessage {
    payload: {
        code?: string
        message: string
    }
    type: 'lobby.error'
}

export interface LobbyNoticeMessage {
    payload: {
        message: string
    }
    type: 'lobby.notice'
}

export interface LobbyPongMessage {
    type: 'pong'
}

export interface LobbyGameActionMessage {
    payload: {
        actionName: string
        actionPayload: unknown
        actionResult: unknown
        actor: {
            id: string
            type: 'game' | 'player'
        }
    }
    type: 'game.event'
}

export interface LobbyEventMessage {
    payload:
        | {
              eventName: 'tip'
              eventPayload: {
                  from: string
                  id: string
                  lobbyId: string
                  to: string
              }
          }
        | {
              eventName: 'kick'
              eventPayload: {
                  memberId: string
              }
          }
    type: 'lobby.event'
}

export type LobbyServerMessage = LobbyErrorMessage | LobbyEventMessage | LobbyGameActionMessage | LobbyNoticeMessage | LobbyPongMessage | LobbyStateMessage
