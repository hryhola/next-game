import type { LobbyGameActionMessage, RealtimeLobbyGameName } from '../../../../shared/contracts/realtime-lobby'
import type { FinalizeLobbySessionInput } from '../../lobby-sessions/store'

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

export type ScheduledTaskResult = {
    action?: LobbyGameActionMessage
    finalizedSession?: FinalizeLobbySessionInput
    stateChanged: boolean
}

export type GameStartResult =
    | {
          action?: LobbyGameActionMessage
          startedSession?: StartedLobbySession
          stateChanged: boolean
          success: true
      }
    | LobbyOperationFailure

export type JeopardyActionResult =
    | {
          action?: LobbyGameActionMessage
          publishToMasterOnly?: boolean
          stateChanged: boolean
          success: true
      }
    | LobbyOperationFailure
