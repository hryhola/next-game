import type { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import type { LobbyData, LobbyMemberRole, TChatMessage, UserData } from './app'
import type { LobbyBaseInfo } from './lobby'
import type { StateEventName, StateEvents } from './state-events'
import type { WSRequestContext } from './ws-context'

export type AuthLoginRequest = {
    token: string
}

export type AuthLoginResponse =
    | {
          success: false
          message: string
      }
    | {
          success: true
          user: UserData
      }

export type AuthLogoutRequest = {
    userNickname: string
}

export type AuthRegisterRequest = {
    userNickname: string
}

export type AuthRegisterResponse =
    | {
          success: false
          message: string
          nickname?: string
      }
    | {
          success: true
          token: string
          user: UserData
      }

export type ChatGetRequest =
    | {
          scope: 'global'
      }
    | {
          lobbyId: string
          scope: 'lobby'
      }

export type ChatGetResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          lobbyId?: string
          messages: TChatMessage[]
          scope: 'global' | 'lobby'
      })

export type ChatSendRequest = {
    message: TChatMessage
} & (
    | {
          scope: 'global'
      }
    | {
          lobbyId: string
          scope: 'lobby'
      }
)

export type GameSendActionRequest = {
    actionName: string
    actionPayload?: unknown
    lobbyId: string
}

export type GameStartRequest = {
    lobbyId: string
}

export type LobbyGetPublicInfoRequest = {
    id: string
}

export type LobbyGetPublicInfoResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          lobbyData: LobbyData
      })

export type LobbyKickRequest = {
    lobbyId: string
    userId: string
}

export type LobbyStartReadyCheckRequest = {
    lobbyId: string
}

export type LobbyTipRequest = {
    from: string
    id: string
    lobbyId: string
    to: string
}

export type ReadyCheckResponseRequest = {
    lobbyId: string
    ready: boolean
}

export type UniversalSubscriptionRequest = {
    mode: 'subscribe' | 'unsubscribe'
} & (
    | {
          scope: 'global'
          topic: StateEventName
      }
    | {
          lobbyId: string
          topic: string
      }
)

export type UsersGetRequest = {
    scope: 'global'
}

export type UsersGetResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          count: number
          data: UserData[]
          lobbyId?: string
          scope: string
      })

export type UsersGetCountRequest = {
    scope: 'global'
}

export type UsersGetCountResponse =
    | GeneralFailure
    | (GeneralSuccess & {
          count: number
          lobbyId?: string
          scope: string
      })

export interface WSRequestMap {
    'Auth-Login': AuthLoginRequest
    'Auth-Logout': AuthLogoutRequest
    'Auth-Register': AuthRegisterRequest
    'Chat-Get': ChatGetRequest
    'Chat-Send': ChatSendRequest
    'Game-SendAction': GameSendActionRequest
    'Game-Start': GameStartRequest
    'Lobby-GetList': null
    'Lobby-GetPublicInfo': LobbyGetPublicInfoRequest
    'Lobby-Kick': LobbyKickRequest
    'Lobby-StartReadyCheck': LobbyStartReadyCheckRequest
    'Lobby-Tip': LobbyTipRequest
    'ReadyCheck-Response': ReadyCheckResponseRequest
    'Universal-Subscription': UniversalSubscriptionRequest
    'Users-Get': UsersGetRequest
    'Users-GetCount': UsersGetCountRequest
}

export interface WSResponseMap {
    'Auth-Login': AuthLoginResponse
    'Auth-Logout': void
    'Auth-Register': AuthRegisterResponse
    'Chat-Get': ChatGetResponse
    'Chat-Send': GeneralSuccess | GeneralFailure
    'Game-SendAction': GeneralSuccess | GeneralFailure
    'Game-Start': GeneralSuccess | GeneralFailure
    'Lobby-GetList': {
        lobbies: LobbyBaseInfo[]
    }
    'Lobby-GetPublicInfo': LobbyGetPublicInfoResponse
    'Lobby-Kick': GeneralSuccess | GeneralFailure | void
    'Lobby-StartReadyCheck': GeneralSuccess | GeneralFailure | void
    'Lobby-Tip': GeneralSuccess | GeneralFailure | void
    'ReadyCheck-Response': GeneralSuccess | GeneralFailure | void
    'Universal-Subscription': void
    'Users-Get': UsersGetResponse
    'Users-GetCount': UsersGetCountResponse
}

export type RequestData<R extends WSRequestContext> = WSRequestMap[R]
export type ResponseData<R extends WSRequestContext> = WSResponseMap[R]
export type RequestHandler<R extends WSRequestContext> = (data: ResponseData<R>) => void
export type TopicEventHandler<E extends StateEventName> = (data: StateEvents[E]) => void
