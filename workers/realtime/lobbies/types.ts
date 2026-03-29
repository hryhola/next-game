import type {
    RealtimeChatMessage,
    RealtimeClickerGame,
    RealtimeClickerSession,
    RealtimeLobbyGame,
    RealtimeLobbyGameName,
    RealtimeLobbyMemberRole,
    RealtimeLobbySnapshot,
    RealtimeReadyCheckState,
    RealtimeTicTacToeGame,
    RealtimeTicTacToeSession,
    TicTacToePlayerChar
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'
import type { ScheduledTask } from '../../../shared/domain/ports/Scheduler'

export interface StoredLobbyMember extends IdentityProfile {
    isCreator: boolean
    joinedAt: string
    playerChar: TicTacToePlayerChar | null
    playerIsClickAllowed: boolean
    playerScore: number
    ready: boolean | null
    role: RealtimeLobbyMemberRole
}

export interface StoredTicTacToeGame extends RealtimeTicTacToeGame {
    session: RealtimeTicTacToeSession
}

export interface StoredClickerGame extends RealtimeClickerGame {
    session: RealtimeClickerSession
}

export type StoredLobbyGame = StoredTicTacToeGame | StoredClickerGame

export interface StoredLobbyState {
    chat: RealtimeChatMessage[]
    createdAt: string
    creatorUserId: string
    game: StoredLobbyGame
    password?: string
    members: StoredLobbyMember[]
    name: string
    readyCheck: RealtimeReadyCheckState
    roomId: string
    updatedAt: string
}

export interface RoomSocketAttachment {
    sessionId: string
    user: IdentityProfile
}

export type RoomScheduledTaskPayload =
    | {
          sessionId: string
          type: 'clicker.allow-click'
      }
    | {
          sessionId: string
          type: 'clicker.complete-session'
          winnerUserId: string
      }
    | {
          sessionId: string
          type: 'clicker.reenable-player'
          userId: string
      }

export type RoomScheduledTask = ScheduledTask<RoomScheduledTaskPayload>

export type ComputedLobbySnapshot = RealtimeLobbySnapshot
