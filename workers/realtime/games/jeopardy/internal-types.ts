import type { IdentityProfile } from '../../../../shared/contracts/identity'
import type {
    RealtimeChatMessage,
    RealtimeJeopardyGameConfig,
    RealtimeLobbyMemberRole,
    RealtimeReadyCheckState
} from '../../../../shared/contracts/realtime-lobby'
import type { JeopardyDeclaration, RealtimeJeopardyQuestionId, RealtimeJeopardySessionState } from '../../../../shared/contracts/jeopardy'

export interface StoredLobbyMember extends IdentityProfile {
    isCreator: boolean
    joinedAt: string
    playerScore: number
    ready: boolean | null
    role: RealtimeLobbyMemberRole
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

export interface StoredJeopardyGame {
    config: RealtimeJeopardyGameConfig
    name: 'Jeopardy'
    packAssetId: string
    packAuthor: string
    packDateCreated: string
    packDeclaration: JeopardyDeclaration.Pack
    packFileName: string
    packName: string
    session: StoredJeopardySession | null
}

export interface StoredLobbyState {
    chat: RealtimeChatMessage[]
    createdAt: string
    creatorUserId: string
    game: StoredJeopardyGame
    members: StoredLobbyMember[]
    name: string
    password?: string
    readyCheck: RealtimeReadyCheckState
    lobbyId: string
    updatedAt: string
}

export type LobbyScheduledTaskPayload =
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
