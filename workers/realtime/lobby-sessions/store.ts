import type { RealtimeLobbySessionSummary } from '../../../shared/contracts/lobby-history'
import type { RealtimeLobbyGameName } from '../../../shared/contracts/realtime-lobby'

type LobbySessionRow = {
    endedAt: string | null
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    resultSummaryJson: string | null
    lobbyId: string
    lobbyName: string
    startedAt: string
    status: RealtimeLobbySessionSummary['status']
    winnerNickname: string | null
    winnerUserId: string | null
}

export interface CreateLobbySessionInput {
    gameName: RealtimeLobbyGameName
    id: string
    initiatedByUserId: string
    lobbyId: string
    lobbyName: string
    startedAt: string
}

export interface FinalizeLobbySessionInput {
    endedAt: string
    id: string
    resultSummary?: Record<string, unknown> | null
    status: Extract<RealtimeLobbySessionSummary['status'], 'completed' | 'abandoned'>
    winnerNickname?: string | null
    winnerUserId?: string | null
}

function mapLobbySessionRow(row: LobbySessionRow): RealtimeLobbySessionSummary {
    return {
        endedAt: row.endedAt,
        gameName: row.gameName,
        id: row.id,
        initiatedByUserId: row.initiatedByUserId,
        resultSummary: row.resultSummaryJson ? (JSON.parse(row.resultSummaryJson) as Record<string, unknown>) : null,
        lobbyId: row.lobbyId,
        lobbyName: row.lobbyName,
        startedAt: row.startedAt,
        status: row.status,
        ...(row.winnerNickname ? { winnerNickname: row.winnerNickname } : {}),
        ...(row.winnerUserId ? { winnerUserId: row.winnerUserId } : {})
    }
}

export async function createLobbySession(db: D1Database, input: CreateLobbySessionInput): Promise<void> {
    await db
        .prepare(
            `
                INSERT INTO lobby_sessions (
                    id,
                    lobby_id,
                    lobby_name,
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
        .bind(input.id, input.lobbyId, input.lobbyName, input.gameName, input.initiatedByUserId, input.startedAt)
        .run()
}

export async function finalizeLobbySession(db: D1Database, input: FinalizeLobbySessionInput): Promise<void> {
    await db
        .prepare(
            `
                UPDATE lobby_sessions
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

export async function getActiveLobbySession(db: D1Database, lobbyId: string): Promise<RealtimeLobbySessionSummary | null> {
    const row = await db
        .prepare(
            `
                SELECT
                    id,
                    lobby_id as lobbyId,
                    lobby_name as lobbyName,
                    game_name as gameName,
                    initiated_by_user_id as initiatedByUserId,
                    status,
                    winner_user_id as winnerUserId,
                    winner_nickname as winnerNickname,
                    result_summary_json as resultSummaryJson,
                    started_at as startedAt,
                    ended_at as endedAt
                FROM lobby_sessions
                WHERE lobby_id = ?1
                    AND status = 'active'
                ORDER BY started_at DESC
                LIMIT 1
            `
        )
        .bind(lobbyId)
        .first<LobbySessionRow>()

    return row ? mapLobbySessionRow(row) : null
}

export async function listLobbySessions(db: D1Database, lobbyId: string, limit: number = 20): Promise<RealtimeLobbySessionSummary[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 100))
    const result = await db
        .prepare(
            `
                SELECT
                    id,
                    lobby_id as lobbyId,
                    lobby_name as lobbyName,
                    game_name as gameName,
                    initiated_by_user_id as initiatedByUserId,
                    status,
                    winner_user_id as winnerUserId,
                    winner_nickname as winnerNickname,
                    result_summary_json as resultSummaryJson,
                    started_at as startedAt,
                    ended_at as endedAt
                FROM lobby_sessions
                WHERE lobby_id = ?1
                ORDER BY started_at DESC
                LIMIT ?2
            `
        )
        .bind(lobbyId, normalizedLimit)
        .all<LobbySessionRow>()

    return (result.results || []).map(mapLobbySessionRow)
}
