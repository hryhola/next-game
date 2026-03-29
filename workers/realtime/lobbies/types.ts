import type {
    RealtimeChatMessage,
    RealtimeClickerGame,
    RealtimeClickerSession,
    RealtimeJeopardyGame,
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
import type { JeopardyDeclaration, RealtimeJeopardyQuestionId, RealtimeJeopardySessionState } from '../../../shared/contracts/jeopardy'
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

export interface StoredJeopardyPausedTask {
    key: string
    payload: RoomScheduledTaskPayload
    remainingMs: number
}

export interface StoredJeopardyQuestionFlow {
    afterAtoms: JeopardyDeclaration.QuestionScenarioContentAtom[]
    beforeAtoms: JeopardyDeclaration.QuestionScenarioContentAtom[]
    questionId: RealtimeJeopardyQuestionId
    shownAtomIndex: number
    stage: 'before' | 'after'
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

export interface StoredJeopardyGame extends Omit<RealtimeJeopardyGame, 'session'> {
    packAssetId: string
    packAuthor: string
    packDateCreated: string
    packDeclaration: JeopardyDeclaration.Pack
    packFileName: string
    packName: string
    session: StoredJeopardySession | null
}

export type StoredLobbyGame = StoredTicTacToeGame | StoredClickerGame | StoredJeopardyGame

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
    | {
          sessionId: string
          type: 'jeopardy.answer-giving.complete'
      }
    | {
          sessionId: string
          type: 'jeopardy.answer-request.complete'
      }
    | {
          sessionId: string
          type: 'jeopardy.answer-verifying.complete'
      }
    | {
          sessionId: string
          type: 'jeopardy.cooldown.complete'
          userId: string
      }
    | {
          questionId: RealtimeJeopardyQuestionId
          sessionId: string
          type: 'jeopardy.pick-question.complete'
      }
    | {
          sessionId: string
          type: 'jeopardy.pack-preview.complete'
      }
    | {
          sessionId: string
          type: 'jeopardy.question.atom.complete'
      }
    | {
          roundId: number
          sessionId: string
          themeIndex: number
          type: 'jeopardy.round-preview.theme'
      }
    | {
          roundId: number
          sessionId: string
          type: 'jeopardy.round-preview.complete'
      }

export type RoomScheduledTask = ScheduledTask<RoomScheduledTaskPayload>

export type ComputedLobbySnapshot = RealtimeLobbySnapshot
