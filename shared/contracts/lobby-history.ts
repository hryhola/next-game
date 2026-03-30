import type { RealtimeLobbyGameName } from './realtime-lobby'

export type RealtimeLobbySessionStatus = 'active' | 'completed' | 'abandoned'

export interface RealtimeLobbySessionSummary {
    endedAt: string | null
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    resultSummary: Record<string, unknown> | null
    lobbyId: string
    lobbyName: string
    startedAt: string
    status: RealtimeLobbySessionStatus
    winnerNickname?: string
    winnerUserId?: string
}
