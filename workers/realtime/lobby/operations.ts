import type { LobbyEventMessage, LobbyGameActionMessage, RealtimeLobbyGameName } from '../../../shared/contracts/realtime-lobby'
import type { FinalizeLobbySessionInput } from '../lobby-sessions/store'

export type LobbyOperationFailure = {
    code: string
    message: string
    success: false
}

export type StartedLobbySession = {
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    startedAt: string
}

export type LobbyMutationSuccess = {
    destroyed?: boolean
    finalizedSession?: FinalizeLobbySessionInput | null
    gameEvent?: LobbyGameActionMessage
    message?: string
    notifyLobbyList?: boolean
    lobbyEvent?: LobbyEventMessage['payload']
    startedSession?: StartedLobbySession
    stateChanged: boolean
    success: true
}

export type LobbyMutationResult = LobbyMutationSuccess | LobbyOperationFailure

export type LobbyJoinResult = LobbyMutationResult
export type LobbyLeaveResult = LobbyMutationResult
export type LobbyKickResult = LobbyMutationResult
