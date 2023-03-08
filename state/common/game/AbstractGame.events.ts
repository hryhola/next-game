import type { ClickerPlayerData } from 'state/games/clicker/ClickerPlayer'
import type { GameAction } from './AbstractGameSession'
import type { AbstractPlayerData } from './AbstractPlayer'

export type Events = {
    'Game-Join': {
        lobbyId: string
        player: ClickerPlayerData
    }
    'Game-Leave': {
        lobbyId: string
        player: ClickerPlayerData
    }
    'Game-Update': {
        updated: {
            players: ClickerPlayerData[]
        }
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
        players: AbstractPlayerData[]
    }
}
