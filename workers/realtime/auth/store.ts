import type { AdminUserListItem } from '../../../shared/contracts/http-api'
import type { IdentityProfile, IdentitySession, UpdateIdentityProfileRequest } from '../../../shared/contracts/identity'
import { SESSION_TTL_MS } from './constants'

type SessionLookupRow = {
    sessionId: string
    expiresAt: string
    userId: string
    userNickname: string
    userColor: string
    userAvatarUrl: string | null
}

type UserLookupRow = {
    userId: string
    userNickname: string
    userColor: string
    userAvatarUrl: string | null
}

type AdminUserLookupRow = {
    id: string
    lastSeenAt: string | null
    name: string
}

type UserAvatarLookupRow = {
    userAvatarUrl: string | null
}

type CreateSessionResult = {
    session: IdentitySession
    sessionToken: string
}

function normalizeNickname(nickname: string): string {
    return nickname.trim().replace(/\s+/g, ' ')
}

function validateNickname(nickname: string): string | null {
    if (!nickname.length) {
        return 'Nickname cannot be empty'
    }

    if (nickname.length > 32) {
        return 'Nickname cannot be longer than 32 characters'
    }

    return null
}

function profileFromRow(row: UserLookupRow | SessionLookupRow): IdentityProfile {
    const profile: IdentityProfile = {
        id: row.userId,
        userNickname: row.userNickname,
        userColor: row.userColor
    }

    if (row.userAvatarUrl) {
        profile.userAvatarUrl = row.userAvatarUrl
    }

    return profile
}

function sessionFromRow(row: SessionLookupRow): IdentitySession {
    return {
        sessionId: row.sessionId,
        expiresAt: row.expiresAt,
        user: profileFromRow(row)
    }
}

function nowIso(): string {
    return new Date().toISOString()
}

function isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Error && error.message.toLowerCase().includes('unique')
}

function ttlDateIso(from = Date.now()): string {
    return new Date(from + SESSION_TTL_MS).toISOString()
}

function colorFromSeed(seed: string): string {
    let hash = 0

    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0
    }

    const hue = Math.abs(hash) % 360

    return `hsl(${hue} 68% 58%)`
}

async function sha256Hex(input: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))

    return Array.from(new Uint8Array(buffer))
        .map(value => value.toString(16).padStart(2, '0'))
        .join('')
}

function createOpaqueToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32))

    return Array.from(bytes)
        .map(value => value.toString(16).padStart(2, '0'))
        .join('')
}

export async function registerIdentity(db: D1Database, userNickname: string): Promise<CreateSessionResult> {
    const normalizedNickname = normalizeNickname(userNickname)
    const nicknameValidationError = validateNickname(normalizedNickname)

    if (nicknameValidationError) {
        throw new Error(nicknameValidationError)
    }

    const existingUser = await db
        .prepare(
            `
                SELECT
                    id as userId,
                    nickname as userNickname,
                    color as userColor,
                    avatar_url as userAvatarUrl
                FROM users
                WHERE lower(nickname) = lower(?1)
                LIMIT 1
            `
        )
        .bind(normalizedNickname)
        .first<UserLookupRow>()

    if (existingUser) {
        throw new Error('Nickname already exists')
    }

    const userId = crypto.randomUUID()
    const createdAt = nowIso()

    try {
        await db
            .prepare(
                `
                    INSERT INTO users (id, nickname, color, avatar_url, created_at, updated_at)
                    VALUES (?1, ?2, ?3, NULL, ?4, ?4)
                `
            )
            .bind(userId, normalizedNickname, colorFromSeed(normalizedNickname), createdAt)
            .run()
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new Error('Nickname already exists')
        }

        throw error
    }

    const user = await db
        .prepare(
            `
                SELECT
                    id as userId,
                    nickname as userNickname,
                    color as userColor,
                    avatar_url as userAvatarUrl
                FROM users
                WHERE id = ?1
                LIMIT 1
            `
        )
        .bind(userId)
        .first<UserLookupRow>()

    if (!user) {
        throw new Error('Failed to create user profile')
    }

    return createSession(db, user)
}

async function createSession(db: D1Database, user: UserLookupRow): Promise<CreateSessionResult> {
    const sessionToken = createOpaqueToken()
    const tokenHash = await sha256Hex(sessionToken)
    const createdAt = nowIso()
    const expiresAt = ttlDateIso()
    const sessionId = crypto.randomUUID()

    await db
        .prepare(
            `
                INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, revoked_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?4, NULL)
            `
        )
        .bind(sessionId, user.userId, tokenHash, createdAt, expiresAt)
        .run()

    return {
        sessionToken,
        session: {
            sessionId,
            expiresAt,
            user: profileFromRow(user)
        }
    }
}

export async function getIdentitySession(db: D1Database, sessionToken: string): Promise<IdentitySession | null> {
    const tokenHash = await sha256Hex(sessionToken)
    const currentTime = nowIso()

    const row = await db
        .prepare(
            `
                SELECT
                    s.id as sessionId,
                    s.expires_at as expiresAt,
                    u.id as userId,
                    u.nickname as userNickname,
                    u.color as userColor,
                    u.avatar_url as userAvatarUrl
                FROM sessions s
                INNER JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = ?1
                    AND s.revoked_at IS NULL
                    AND s.expires_at > ?2
                LIMIT 1
            `
        )
        .bind(tokenHash, currentTime)
        .first<SessionLookupRow>()

    if (!row) {
        return null
    }

    const nextExpiry = ttlDateIso()

    await db
        .prepare(
            `
                UPDATE sessions
                SET last_seen_at = ?1, expires_at = ?2
                WHERE id = ?3
            `
        )
        .bind(currentTime, nextExpiry, row.sessionId)
        .run()

    return {
        ...sessionFromRow(row),
        expiresAt: nextExpiry
    }
}

export async function revokeIdentitySession(db: D1Database, sessionToken: string): Promise<void> {
    const tokenHash = await sha256Hex(sessionToken)

    await db
        .prepare(
            `
                UPDATE sessions
                SET revoked_at = ?1
                WHERE token_hash = ?2
                    AND revoked_at IS NULL
            `
        )
        .bind(nowIso(), tokenHash)
        .run()
}

export async function listIdentityUsers(db: D1Database): Promise<AdminUserListItem[]> {
    const result = await db
        .prepare(
            `
                SELECT
                    u.id as id,
                    u.nickname as name,
                    MAX(s.last_seen_at) as lastSeenAt
                FROM users u
                LEFT JOIN sessions s ON s.user_id = u.id
                GROUP BY u.id, u.nickname, u.updated_at
                ORDER BY COALESCE(MAX(s.last_seen_at), u.updated_at) DESC, lower(u.nickname) ASC
            `
        )
        .all<AdminUserLookupRow>()

    return (result.results || []).map(row => ({
        id: row.id,
        lastSeenAt: row.lastSeenAt,
        name: row.name
    }))
}

export async function listIdentityAvatarUrls(db: D1Database): Promise<string[]> {
    const result = await db
        .prepare(
            `
                SELECT
                    avatar_url as userAvatarUrl
                FROM users
                WHERE avatar_url IS NOT NULL
                    AND trim(avatar_url) != ''
            `
        )
        .all<UserAvatarLookupRow>()

    return (result.results || []).map(row => row.userAvatarUrl?.trim() || '').filter(url => Boolean(url))
}

export async function destroyIdentityUser(db: D1Database, userId: string): Promise<boolean> {
    const existingUser = await db
        .prepare(
            `
                SELECT id
                FROM users
                WHERE id = ?1
                LIMIT 1
            `
        )
        .bind(userId)
        .first<{ id: string }>()

    if (!existingUser) {
        return false
    }

    await db
        .prepare(
            `
                DELETE FROM users
                WHERE id = ?1
            `
        )
        .bind(userId)
        .run()

    return true
}

export async function updateIdentityProfile(db: D1Database, session: IdentitySession, patch: UpdateIdentityProfileRequest): Promise<IdentitySession> {
    const updates: string[] = []
    const bindings: Array<string | null> = []

    if (typeof patch.userNickname === 'string') {
        const normalizedNickname = normalizeNickname(patch.userNickname)
        const nicknameValidationError = validateNickname(normalizedNickname)

        if (nicknameValidationError) {
            throw new Error(nicknameValidationError)
        }

        const existingUser = await db
            .prepare(
                `
                    SELECT id as userId
                    FROM users
                    WHERE lower(nickname) = lower(?1)
                        AND id != ?2
                    LIMIT 1
                `
            )
            .bind(normalizedNickname, session.user.id)
            .first<{ userId: string }>()

        if (existingUser) {
            throw new Error('Nickname already exists')
        }

        updates.push('nickname = ?')
        bindings.push(normalizedNickname)
    }

    if (typeof patch.userColor === 'string') {
        const normalizedColor = patch.userColor.trim()

        if (!normalizedColor.length) {
            throw new Error('Color cannot be empty')
        }

        updates.push('color = ?')
        bindings.push(normalizedColor)
    }

    if (patch.userAvatarUrl === null) {
        updates.push('avatar_url = ?')
        bindings.push(null)
    } else if (typeof patch.userAvatarUrl === 'string') {
        updates.push('avatar_url = ?')
        bindings.push(patch.userAvatarUrl.trim())
    }

    if (!updates.length) {
        return session
    }

    updates.push('updated_at = ?')
    bindings.push(nowIso())
    bindings.push(session.user.id)

    try {
        await db
            .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
            .bind(...bindings)
            .run()
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new Error('Nickname already exists')
        }

        throw error
    }

    const refreshedUser = await db
        .prepare(
            `
                SELECT
                    id as userId,
                    nickname as userNickname,
                    color as userColor,
                    avatar_url as userAvatarUrl
                FROM users
                WHERE id = ?1
                LIMIT 1
            `
        )
        .bind(session.user.id)
        .first<UserLookupRow>()

    if (!refreshedUser) {
        throw new Error('Failed to reload user profile')
    }

    return {
        ...session,
        user: profileFromRow(refreshedUser)
    }
}
