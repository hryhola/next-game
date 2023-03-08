import type { GameAction } from './AbstractGameSession'
import type { AbstractPlayerData } from './AbstractPlayer'

export type Events = {
    'Game-Join': {
        lobbyId: string
        player: AbstractPlayerData
    }
    'Game-Leave': {
        lobbyId: string
        player: AbstractPlayerData
    }
    'Game-PlayerUpdate': {
        id: string
        data: Partial<AbstractPlayerData>
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
