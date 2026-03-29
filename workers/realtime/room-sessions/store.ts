import type { RealtimeRoomSessionSummary } from '../../../shared/contracts/room-history'
import type { RealtimeLobbyGameName } from '../../../shared/contracts/realtime-lobby'

type RoomSessionRow = {
    endedAt: string | null
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    resultSummaryJson: string | null
    roomId: string
    roomName: string
    startedAt: string
    status: RealtimeRoomSessionSummary['status']
    winnerNickname: string | null
    winnerUserId: string | null
}

export interface CreateRoomSessionInput {
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    roomId: string
    roomName: string
    startedAt: string
}

export interface FinalizeRoomSessionInput {
    endedAt: string
    id: string
    resultSummary?: Record<string, unknown> | null
    status: Extract<RealtimeRoomSessionSummary['status'], 'completed' | 'abandoned'>
    winnerNickname?: string | null
    winnerUserId?: string | null
}

function mapRoomSessionRow(row: RoomSessionRow): RealtimeRoomSessionSummary {
    return {
        endedAt: row.endedAt,
        gameName: row.gameName,
        id: row.id,
        initiatedByUserId: row.initiatedByUserId,
        resultSummary: row.resultSummaryJson ? (JSON.parse(row.resultSummaryJson) as Record<string, unknown>) : null,
        roomId: row.roomId,
        roomName: row.roomName,
        startedAt: row.startedAt,
        status: row.status,
        ...(row.winnerNickname ? { winnerNickname: row.winnerNickname } : {}),
        ...(row.winnerUserId ? { winnerUserId: row.winnerUserId } : {})
    }
}

export async function createRoomSession(db: D1Database, input: CreateRoomSessionInput): Promise<void> {
    await db
        .prepare(
            `
                INSERT INTO room_sessions (
                    id,
                    room_id,
                    room_name,
                    game_name,
                    initiated_by_user_id,
                    status,
                    winner_user_id,
                    winner_nickname,
                    result_summary_json,
                    started_at,
                    ended_at,
                    created_at,
                    updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, 'active', NULL, NULL, NULL, ?6, NULL, ?6, ?6)
            `
        )
        .bind(input.id, input.roomId, input.roomName, input.gameName, input.initiatedByUserId, input.startedAt)
        .run()
}

export async function finalizeRoomSession(db: D1Database, input: FinalizeRoomSessionInput): Promise<void> {
    await db
        .prepare(
            `
                UPDATE room_sessions
                SET
                    status = ?1,
                    winner_user_id = ?2,
                    winner_nickname = ?3,
                    result_summary_json = ?4,
                    ended_at = ?5,
                    updated_at = ?5
                WHERE id = ?6
            `
        )
        .bind(
            input.status,
            input.winnerUserId || null,
            input.winnerNickname || null,
            input.resultSummary ? JSON.stringify(input.resultSummary) : null,
            input.endedAt,
            input.id
        )
        .run()
}

export async function getActiveRoomSession(db: D1Database, roomId: string): Promise<RealtimeRoomSessionSummary | null> {
    const row = await db
        .prepare(
            `
                SELECT
                    id,
                    room_id as roomId,
                    room_name as roomName,
                    game_name as gameName,
                    initiated_by_user_id as initiatedByUserId,
                    status,
                    winner_user_id as winnerUserId,
                    winner_nickname as winnerNickname,
                    result_summary_json as resultSummaryJson,
                    started_at as startedAt,
                    ended_at as endedAt
                FROM room_sessions
                WHERE room_id = ?1
                    AND status = 'active'
                ORDER BY started_at DESC
                LIMIT 1
            `
        )
        .bind(roomId)
        .first<RoomSessionRow>()

    return row ? mapRoomSessionRow(row) : null
}

export async function listRoomSessions(db: D1Database, roomId: string, limit: number = 20): Promise<RealtimeRoomSessionSummary[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 100))
    const result = await db
        .prepare(
            `
                SELECT
                    id,
                    room_id as roomId,
                    room_name as roomName,
                    game_name as gameName,
                    initiated_by_user_id as initiatedByUserId,
                    status,
                    winner_user_id as winnerUserId,
                    winner_nickname as winnerNickname,
                    result_summary_json as resultSummaryJson,
                    started_at as startedAt,
                    ended_at as endedAt
                FROM room_sessions
                WHERE room_id = ?1
                ORDER BY started_at DESC
                LIMIT ?2
            `
        )
        .bind(roomId, normalizedLimit)
        .all<RoomSessionRow>()

    return (result.results || []).map(mapRoomSessionRow)
}
