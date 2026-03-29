CREATE TABLE IF NOT EXISTS room_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    game_name TEXT NOT NULL,
    initiated_by_user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    winner_user_id TEXT,
    winner_nickname TEXT,
    result_summary_json TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_sessions_room_started ON room_sessions(room_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_sessions_status ON room_sessions(status, started_at DESC);
