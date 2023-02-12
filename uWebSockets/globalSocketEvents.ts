import { ClickerPlayerData, TChatMessage } from 'state'

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
    'Clicker-Join': {
        success: true
        lobbyId: string
        player: ClickerPlayerData
    }
}

export type WSEventName = keyof WSEvents
