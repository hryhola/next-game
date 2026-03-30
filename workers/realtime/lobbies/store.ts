import type { RealtimeLobbyListItem } from '../../../shared/contracts/realtime-lobby'

type LobbyRow = {
    createdAt: string
    creatorNickname: string
    creatorUserId: string
    gameName: string
    hasPassword: number
    membersCount: number
    name: string
    playersCount: number
    lobbyId: string
    status: string
    updatedAt: string
}

function mapLobbyRow(row: LobbyRow): RealtimeLobbyListItem {
    return {
        id: row.lobbyId,
        private: Boolean(row.hasPassword),
        createdAt: row.createdAt,
        creatorNickname: row.creatorNickname,
        creatorUserId: row.creatorUserId,
        gameName: row.gameName as RealtimeLobbyListItem['gameName'],
        membersCount: row.membersCount,
        name: row.name,
        playersCount: row.playersCount,
        status: row.status as RealtimeLobbyListItem['status'],
        updatedAt: row.updatedAt
    }
}

export async function listLobbies(db: D1Database): Promise<RealtimeLobbyListItem[]> {
    const result = await db
        .prepare(
            `
                SELECT
                    lobby_id as lobbyId,
                    name,
                    game_name as gameName,
                    creator_user_id as creatorUserId,
                    creator_nickname as creatorNickname,
                    has_password as hasPassword,
                    members_count as membersCount,
                    players_count as playersCount,
                    status,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM lobbies
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
            `
        )
        .all<LobbyRow>()

    return (result.results || []).map(mapLobbyRow)
}

export async function getLobbyMetadata(db: D1Database, lobbyId: string): Promise<RealtimeLobbyListItem | null> {
    const row = await db
        .prepare(
            `
                SELECT
                    lobby_id as lobbyId,
                    name,
                    game_name as gameName,
                    creator_user_id as creatorUserId,
                    creator_nickname as creatorNickname,
                    has_password as hasPassword,
                    members_count as membersCount,
                    players_count as playersCount,
                    status,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM lobbies
                WHERE lobby_id = ?1
                    AND deleted_at IS NULL
                LIMIT 1
            `
        )
        .bind(lobbyId)
        .first<LobbyRow>()

    return row ? mapLobbyRow(row) : null
}

export async function upsertLobbyMetadata(db: D1Database, item: RealtimeLobbyListItem): Promise<void> {
    await db
        .prepare(
            `
                INSERT INTO lobbies (
                    lobby_id,
                    name,
                    game_name,
                    creator_user_id,
                    creator_nickname,
                    has_password,
                    members_count,
                    players_count,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL)
                ON CONFLICT(lobby_id) DO UPDATE SET
                    name = excluded.name,
                    game_name = excluded.game_name,
                    creator_user_id = excluded.creator_user_id,
                    creator_nickname = excluded.creator_nickname,
                    has_password = excluded.has_password,
                    members_count = excluded.members_count,
                    players_count = excluded.players_count,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    deleted_at = NULL
            `
        )
        .bind(
            item.id,
            item.name,
            item.gameName,
            item.creatorUserId,
            item.creatorNickname,
            item.private ? 1 : 0,
            item.membersCount,
            item.playersCount,
            item.status,
            item.createdAt,
            item.updatedAt
        )
        .run()
}

export async function markLobbyDeleted(db: D1Database, lobbyId: string, deletedAt: string): Promise<void> {
    await db
        .prepare(
            `
                UPDATE lobbies
                SET deleted_at = ?1, updated_at = ?1
                WHERE lobby_id = ?2
            `
        )
        .bind(deletedAt, lobbyId)
        .run()
}
