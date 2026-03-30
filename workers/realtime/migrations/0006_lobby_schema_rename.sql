ALTER TABLE lobbies RENAME COLUMN room_id TO lobby_id;

ALTER TABLE room_sessions RENAME TO lobby_sessions;
ALTER TABLE lobby_sessions RENAME COLUMN room_id TO lobby_id;
ALTER TABLE lobby_sessions RENAME COLUMN room_name TO lobby_name;

DROP INDEX IF EXISTS idx_room_sessions_room_started;
DROP INDEX IF EXISTS idx_room_sessions_status;

CREATE INDEX IF NOT EXISTS idx_lobby_sessions_lobby_started ON lobby_sessions(lobby_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobby_sessions_status ON lobby_sessions(status, started_at DESC);
