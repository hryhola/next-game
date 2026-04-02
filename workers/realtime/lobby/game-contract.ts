import type { IdentityProfile } from '../../../shared/contracts/identity'
import type {
    LobbyGameActionMessage,
    RealtimeLobbyGameName,
    RealtimeLobbyMemberRole,
    RealtimeLobbyStatus,
    LobbyGameView
} from '../../../shared/contracts/realtime-lobby'
import type { FinalizeLobbySessionInput } from '../lobby-sessions/store'
import type { LobbyScheduler } from '../scheduler/LobbyScheduler'
import type { LobbyOperationFailure, LobbyMutationResult } from './operations'
import type { LobbyRecordV2, LobbyScheduledTaskPayload, StoredLobbyGameState } from './types'

export interface LobbyGamePolicy {
    getReadyCheckParticipantIds(record: LobbyRecordV2): string[]
    isInProgress(record: LobbyRecordV2): boolean
    validateReadyCheck(record: LobbyRecordV2): LobbyOperationFailure | null
    validateRole(record: LobbyRecordV2, user: IdentityProfile, role: RealtimeLobbyMemberRole): LobbyOperationFailure | null
}

export interface LobbyGameContext {
    createGameActionMessage: (payload: LobbyGameActionMessage['payload']) => LobbyGameActionMessage
    getConnectedSocketsCount: (userId: string) => number
    persistFinalizedLobbySession: (session: FinalizeLobbySessionInput | null | undefined) => Promise<void>
    scheduler: LobbyScheduler<LobbyScheduledTaskPayload>
}

export interface LobbyGameFeature<TGame extends StoredLobbyGameState = StoredLobbyGameState> {
    create(config: unknown, creator: IdentityProfile): TGame
    createSessionRecord(record: LobbyRecordV2, reason?: string): FinalizeLobbySessionInput | null
    getLobbyStatus(record: LobbyRecordV2): RealtimeLobbyStatus
    getPolicy(record: LobbyRecordV2): LobbyGamePolicy
    handleCommand(record: LobbyRecordV2, actorUserId: string, commandName: string, commandPayload: unknown, ctx: LobbyGameContext): Promise<LobbyMutationResult>
    handleTask(record: LobbyRecordV2, task: LobbyScheduledTaskPayload, ctx: LobbyGameContext): Promise<LobbyMutationResult>
    kind: RealtimeLobbyGameName
    onTip(record: LobbyRecordV2, fromUserId: string, toUserId: string, ctx: LobbyGameContext): Promise<LobbyMutationResult>
    onMembersChanged(
        record: LobbyRecordV2,
        reason: 'creator_reassigned' | 'member_joined' | 'member_kicked' | 'member_left' | 'member_role_changed',
        ctx: LobbyGameContext
    ): Promise<LobbyMutationResult>
    project(record: LobbyRecordV2, ctx: Pick<LobbyGameContext, 'getConnectedSocketsCount'>, viewerUserId?: string): LobbyGameView
    start(record: LobbyRecordV2, actorUserId: string, ctx: LobbyGameContext): Promise<LobbyMutationResult>
}
