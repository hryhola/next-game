import type { RealtimeLobbyGameName } from './realtime-lobby'

export type RealtimeRoomSessionStatus = 'active' | 'completed' | 'abandoned'

export interface RealtimeRoomSessionSummary {
    endedAt: string | null
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    resultSummary: Record<string, unknown> | null
    roomId: string
    roomName: string
    startedAt: string
    status: RealtimeRoomSessionStatus
    winnerNickname?: string
    winnerUserId?: string
}
