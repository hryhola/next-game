import { ClickerPlayerData, LobbyData, TChatMessage, Tip } from 'state'

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
    'Lobby-Update': {
        lobbyId: string
        updated: Partial<LobbyData>
    }
    'Lobby-Tipped': Tip
    'Clicker-Join': {
        success: true
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
