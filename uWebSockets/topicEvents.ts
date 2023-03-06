import { AbstractPlayerData, ClickerPlayerData, GameAction, LobbyData, LobbyMemberData, TChatMessage, Tip } from 'state'
import { LobbyBaseInfo } from './ws/Lobby-GetList'

export type TopicEvents = {
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
    'Lobby-ListUpdated': {
        lobbies: LobbyBaseInfo[]
    }
    'Lobby-Tipped': Tip
    'Lobby-Kicked': {
        lobbyId: string
        member: LobbyMemberData
    }
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
    'Clicker-SessionStart': {
        lobbyId: string
    }
    'Game-SessionAction': GameAction & {
        lobbyId: string
    }
    'Game-SessionEnd': {
        lobbyId: string
        state: any
        players: AbstractPlayerData[]
    }
    'ReadyCheck-Start': {
        members: LobbyMemberData[]
    }
    'ReadyCheck-PlayerStatus': {
        nickname: string
        ready: boolean
    }
    'ReadyCheck-End': {
        status: 'success' | 'failed'
    }
}

export type TopicEventName = keyof TopicEvents
