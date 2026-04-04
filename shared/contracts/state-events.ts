import type { GameActionEvent } from './game-actions'
import type { LobbyBaseInfo } from './lobby'
import type { GameData, LobbyData, LobbyMemberData, PlayerData, TChatMessage, Tip } from './app'

export interface StateEvents {
    'Chat-NewMessage': {
        scope: 'global' | 'lobby'
        lobbyId?: string
        message: TChatMessage
    }
    'Game-Join': {
        lobbyId: string
        player: PlayerData
    }
    'Game-Leave': {
        lobbyId: string
        player: PlayerData
    }
    'Game-PlayerUpdate': {
        id: string
        data: Partial<PlayerData>
    }
    'Game-SessionAction': GameActionEvent<string, unknown, any> & {
        lobbyId: string
    }
    'Game-SessionEnd': {
        lobbyId: string
        players: PlayerData[]
        session: unknown
    }
    'Game-SessionStart': {
        lobbyId: string
        session: unknown
    }
    'Game-SessionUpdate': {
        lobbyId: string
        data: any
    }
    'Lobby-Destroy': {
        lobbyId: string
    }
    'Lobby-Join': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-Kicked': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-Leave': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-ListUpdated': {
        lobbies: LobbyBaseInfo[]
    }
    'Lobby-Snapshot': {
        game: GameData
        lobby: LobbyData
        lobbyId: string
    }
    'Lobby-MemberUpdate': {
        lobbyId: string
        data: Partial<LobbyMemberData>
    }
    'Lobby-Tipped': Tip
    'ReadyCheck-End': {
        status: 'success' | 'failed'
    }
    'ReadyCheck-PlayerStatus': {
        userNickname: string
        ready: boolean
    }
    'ReadyCheck-Start': {
        members: LobbyMemberData[]
    }
    'UserRegistry-OnlineUpdate': {
        scope: 'global'
        list: {
            id: string
            userNickname: string
        }[]
    }
}

export type StateEventName = keyof StateEvents
