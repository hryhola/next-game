CREATE TABLE IF NOT EXISTS lobbies (
    room_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    game_name TEXT NOT NULL,
    creator_user_id TEXT NOT NULL,
    creator_nickname TEXT NOT NULL,
    has_password INTEGER NOT NULL DEFAULT 0,
    members_count INTEGER NOT NULL DEFAULT 0,
    players_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lobbies_deleted_at ON lobbies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lobbies_created_at ON lobbies(created_at);
