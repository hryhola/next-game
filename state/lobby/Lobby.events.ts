import type { LobbyData, LobbyMemberData, Tip } from 'state'
import { LobbyBaseInfo } from 'uWebSockets/ws/Lobby-GetList'

export type Events = {
    'Lobby-Join': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-Leave': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-MemberUpdate': {
        lobbyId: string
        data: Partial<LobbyMemberData>
    }
    'Lobby-Destroy': {
        lobbyId: string
    }
    'Lobby-ListUpdated': {
        lobbies: LobbyBaseInfo[]
    }
    'Lobby-Tipped': Tip
    'Lobby-Kicked': {
        lobbyId: string
        member: LobbyMemberData
    }
}
