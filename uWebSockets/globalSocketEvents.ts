import { ClickerPlayerData, LobbyData, LobbyMemberData, TChatMessage, Tip } from 'state'

export type WSEvents = {
    'Chat-NewMessage': {
        scope: 'global' | 'lobby'
        lobbyId?: string
        message: TChatMessage
    }
    'UserRegistry-OnlineUpdate': {
        scope: 'global'
        list: { nickname: string }[]
    }
    'Lobby-Join': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-Leave': {
        lobbyId: string
        member: LobbyMemberData
    }
    'Lobby-Update': {
        lobbyId: string
        updated: Partial<LobbyData>
    }
    'Lobby-Destroy': {
        lobbyId: string
    }
    'Lobby-Tipped': Tip
    'Clicker-Join': {
        lobbyId: string
        player: ClickerPlayerData
    }
    'Clicker-Leave': {
        lobbyId: string
        player: ClickerPlayerData
    }
    'Clicker-Update': {
        updated: {
            players: ClickerPlayerData[]
        }
    }
}

export type WSEventName = keyof WSEvents
