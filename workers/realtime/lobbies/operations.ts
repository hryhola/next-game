import type { LobbyRoomGameActionMessage, RealtimeLobbyGameName } from '../../../shared/contracts/realtime-lobby'
import type { FinalizeRoomSessionInput } from '../room-sessions/store'

export type RoomOperationFailure = {
    code: string
    message: string
    success: false
}

export type StartedRoomSession = {
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    startedAt: string
}

export type ScheduledTaskResult = {
    action?: LobbyRoomGameActionMessage
    finalizedSession?: FinalizeRoomSessionInput
    stateChanged: boolean
}

export type GameStartResult =
    | {
          success: true
          action?: LobbyRoomGameActionMessage
          startedSession?: StartedRoomSession
          stateChanged: boolean
      }
    | RoomOperationFailure

export type ClickerClickResult =
    | {
          action: LobbyRoomGameActionMessage
          stateChanged: boolean
          success: true
      }
    | RoomOperationFailure

export type TicTacToeMoveResult =
    | {
          finalizedSession?: FinalizeRoomSessionInput
          success: true
      }
    | RoomOperationFailure

export type JeopardyActionResult =
    | {
          action?: LobbyRoomGameActionMessage
          publishToMasterOnly?: boolean
          stateChanged: boolean
          success: true
      }
    | RoomOperationFailure

export type RoomJoinResult =
    | {
          message: string
          success: true
      }
    | RoomOperationFailure

export type RoomLeaveResult =
    | {
          destroyed?: boolean
          message: string
          success: true
      }
    | RoomOperationFailure

export type RoomKickResult =
    | {
          memberId: string
          success: true
      }
    | RoomOperationFailure

export type RoomMutationResult = { success: true } | RoomOperationFailure

export type RoomTipResult =
    | {
          success: true
          tip: {
              from: string
              id: string
              lobbyId: string
              to: string
          }
      }
    | RoomOperationFailure
