import { SessionState } from 'http2'
import type { GameAction } from './GameSession'
import type { PlayerData } from './Player'

export type Events = {
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
    'Game-SessionStart': {
        lobbyId: string
        session: any
    }
    'Game-SessionAction': GameAction & {
        lobbyId: string
    }
    'Game-SessionEnd': {
        lobbyId: string
        session: any
        players: PlayerData[]
    }
    'Game-SessionUpdate': {
        lobbyId: string
        data: any
    }
}
