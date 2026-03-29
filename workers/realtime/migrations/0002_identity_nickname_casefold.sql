CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_lower ON users(lower(nickname));

