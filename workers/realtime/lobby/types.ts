import type {
    RealtimeChatMessage,
    RealtimeClickerGameConfig,
    RealtimeClickerSession,
    RealtimeJeopardyGameConfig,
    RealtimeLobbyGameName,
    RealtimeLobbyMemberRole,
    RealtimeReadyCheckState,
    RealtimeTicTacToeGameConfig,
    RealtimeTicTacToeSession,
    TicTacToePlayerChar
} from '../../../shared/contracts/realtime-lobby'
import type { IdentityProfile } from '../../../shared/contracts/identity'
import type { JeopardyDeclaration, RealtimeJeopardyQuestionId, RealtimeJeopardySessionState } from '../../../shared/contracts/jeopardy'
import type { ScheduledTask } from '../../../shared/domain/ports/Scheduler'

export interface StoredLobbyMeta {
    createdAt: string
    creatorUserId: string
    id: string
    name: string
    password?: string
    updatedAt: string
}

export interface StoredLobbyMember extends IdentityProfile {
    isCreator: boolean
    joinedAt: string
    role: RealtimeLobbyMemberRole
}

export interface StoredReadyCheckState extends RealtimeReadyCheckState {}

export interface StoredTicTacToeParticipant {
    memberId: string
    seat: TicTacToePlayerChar
}

export interface StoredClickerParticipant {
    isClickAllowed: boolean
    memberId: string
    score: number
}

export interface StoredJeopardyParticipant {
    memberId: string
    role: 'contestant' | 'master'
    score: number
}

export interface StoredTicTacToeGameState {
    config: RealtimeTicTacToeGameConfig
    kind: 'TicTacToe'
    participants: StoredTicTacToeParticipant[]
    session: RealtimeTicTacToeSession
}

export interface StoredClickerGameState {
    config: RealtimeClickerGameConfig
    kind: 'Clicker'
    participants: StoredClickerParticipant[]
    session: RealtimeClickerSession
}

export interface StoredJeopardyPausedTask {
    key: string
    payload: LobbyScheduledTaskPayload
    remainingMs: number
}

export interface StoredJeopardyQuestionFlow {
    afterAtoms: JeopardyDeclaration.QuestionScenarioContentAtom[]
    beforeAtoms: JeopardyDeclaration.QuestionScenarioContentAtom[]
    questionId: RealtimeJeopardyQuestionId
    shownAtomIndex: number
    stage: 'after' | 'before'
}

export interface StoredJeopardySessionMeta {
    answerRequestRemainingMs: number | null
    currentQuestionFlow: StoredJeopardyQuestionFlow | null
    mediaElapsedTimeMs: number
    mediaStartedAt: string | null
    pausedTasks: StoredJeopardyPausedTask[]
}

export interface StoredJeopardySession extends RealtimeJeopardySessionState {
    meta: StoredJeopardySessionMeta
}

export interface StoredJeopardyGameState {
    config: RealtimeJeopardyGameConfig
    kind: 'Jeopardy'
    packAssetId: string
    packAuthor: string
    packDateCreated: string
    packDeclaration: JeopardyDeclaration.Pack
    packFileName: string
    packName: string
    participants: StoredJeopardyParticipant[]
    session: StoredJeopardySession | null
}

export type StoredLobbyGameState = StoredClickerGameState | StoredJeopardyGameState | StoredTicTacToeGameState

export interface LobbyRecordV2 {
    chat: RealtimeChatMessage[]
    game: StoredLobbyGameState
    members: StoredLobbyMember[]
    readyCheck: StoredReadyCheckState
    lobby: StoredLobbyMeta
    version: 2
}

export interface LobbySocketAttachment {
    sessionId: string
    user: IdentityProfile
}

export interface LobbyScheduledTaskPayload {
    gameKind: RealtimeLobbyGameName
    taskName: string
    taskPayload?: Record<string, unknown>
}

export type LobbyScheduledTask = ScheduledTask<LobbyScheduledTaskPayload>
