import type {
    RealtimeChatMessage,
    RealtimeLobbyGameName,
    RealtimeLobbyMemberRole,
    RealtimeLobbySnapshot,
    RealtimeReadyCheckState,
    RealtimeTicTacToeSession,
    TicTacToePlayerChar
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'

export interface StoredLobbyMember extends IdentityProfile {
    isCreator: boolean
    joinedAt: string
    playerChar: TicTacToePlayerChar | null
    ready: boolean | null
    role: RealtimeLobbyMemberRole
}

export interface StoredLobbyState {
    chat: RealtimeChatMessage[]
    createdAt: string
    creatorUserId: string
    game: {
        name: RealtimeLobbyGameName
        session: RealtimeTicTacToeSession
    }
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

export type ComputedLobbySnapshot = RealtimeLobbySnapshot
