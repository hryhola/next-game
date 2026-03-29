import type { GameData, LobbyData } from 'state'
import type { InitialGameDataSchema } from 'state/common/game/GameInitialData'
import type { GameName } from 'state/games'
import type { LobbyJoiningResult, LobbyMemberRole } from 'state/lobby/Lobby'
import type { GeneralFailure, GeneralSuccess } from 'util/universalTypes'

export type EndpointInfo<Req = null, Res = null> = {
    request: Req
    response: Res
}

export type GameGetSchemaRequest = {
    gameName: GameName
}

export type GameGetSchemaResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          gameName: GameName
          initialDataScheme?: InitialGameDataSchema
      })

export type LobbyCreateRequest = FormData

export type LobbyCreateResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          lobbyJoiningResult: LobbyJoiningResult
      })

export type LobbyDataRequest = {
    lobbyId: string
}

export type LobbyDataResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          game: GameData
          lobby: LobbyData
      })

export type LobbyDestroyRequest = {
    lobbyId: string
}

export type LobbyDestroyResponse = GeneralSuccess | GeneralFailure

export type LobbyJoinRequest = {
    joinAs: LobbyMemberRole
    lobbyId: string
    password?: string
}

export type LobbyJoinResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          gameJoiningResult?: GeneralSuccess | GeneralFailure | null
      })

export type LobbyLeaveRequest = {
    lobbyId: string
}

export type LobbyLeaveResponse = GeneralSuccess | GeneralFailure

export type ProfileRequest = FormData

export type ProfileResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          userAvatarUrl?: string
      })

export type HTTPEndpoints = {
    'game-get-schema': EndpointInfo<GameGetSchemaRequest, GameGetSchemaResponse>
    'lobby-create': EndpointInfo<LobbyCreateRequest, LobbyCreateResponse>
    'lobby-data': EndpointInfo<LobbyDataRequest, LobbyDataResponse>
    'lobby-destroy': EndpointInfo<LobbyDestroyRequest, LobbyDestroyResponse>
    'lobby-join': EndpointInfo<LobbyJoinRequest, LobbyJoinResponse>
    'lobby-leave': EndpointInfo<LobbyLeaveRequest, LobbyLeaveResponse>
    profile: EndpointInfo<ProfileRequest, ProfileResponse>
}

export type HTTPEndpointName = keyof HTTPEndpoints
