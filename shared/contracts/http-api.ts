import type { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import type { GameData, GameName, InitialGameDataSchema, LobbyData, LobbyJoiningResult, LobbyMemberRole } from './app'
import type { IdentityProfile } from './identity'

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

export type JeopardyValidatePackRequest = FormData

export type JeopardyValidatePackResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          compatible: boolean
          reason?: string
      })

export type AdminUserListItem = {
    id: string
    lastSeenAt: string | null
    name: string
}

export type AdminLobbyListItem = {
    createdAt: string
    id: string
    membersCount: number
    name: string
    onlineUsers: number
    updatedAt: string
}

export type AdminStateResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          lobbies: AdminLobbyListItem[]
          users: AdminUserListItem[]
      })

export type AdminUserDestroyRequest = {
    userId: string
}

export type AdminUserDestroyResponse = GeneralSuccess | GeneralFailure

export type AdminLobbyDestroyRequest = {
    lobbyId: string
}

export type AdminLobbyDestroyResponse = GeneralSuccess | GeneralFailure

export type AdminAssetPurgeRequest = Record<string, never>

export type AdminAssetPurgeSummary = {
    deletedAssetCount: number
    deletedBucketObjectCount: number
    fallbackLobbyCount: number
    referencedAssetCount: number
    scannedBucketObjectCount: number
    scannedLobbyCount: number
    scannedUserAvatarCount: number
}

export type AdminAssetPurgeResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          summary: AdminAssetPurgeSummary
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
          user: IdentityProfile
      })

export type HTTPEndpoints = {
    'admin-asset-purge': EndpointInfo<AdminAssetPurgeRequest, AdminAssetPurgeResponse>
    'admin-lobby-destroy': EndpointInfo<AdminLobbyDestroyRequest, AdminLobbyDestroyResponse>
    'admin-user-destroy': EndpointInfo<AdminUserDestroyRequest, AdminUserDestroyResponse>
    'game-get-schema': EndpointInfo<GameGetSchemaRequest, GameGetSchemaResponse>
    'jeopardy-validate-pack': EndpointInfo<JeopardyValidatePackRequest, JeopardyValidatePackResponse>
    'lobby-create': EndpointInfo<LobbyCreateRequest, LobbyCreateResponse>
    'lobby-data': EndpointInfo<LobbyDataRequest, LobbyDataResponse>
    'lobby-destroy': EndpointInfo<LobbyDestroyRequest, LobbyDestroyResponse>
    'lobby-join': EndpointInfo<LobbyJoinRequest, LobbyJoinResponse>
    'lobby-leave': EndpointInfo<LobbyLeaveRequest, LobbyLeaveResponse>
    profile: EndpointInfo<ProfileRequest, ProfileResponse>
}

export type HTTPEndpointName = keyof HTTPEndpoints
