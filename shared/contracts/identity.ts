export interface IdentityProfile {
    id: string
    userNickname: string
    userColor: string
    userAvatarUrl?: string
}

export interface IdentitySession {
    sessionId: string
    expiresAt: string
    user: IdentityProfile
}

export interface RegisterIdentityRequest {
    userNickname: string
}

export interface UpdateIdentityProfileRequest {
    userNickname?: string
    userColor?: string
    userAvatarUrl?: string | null
}

export interface PresenceUser extends IdentityProfile {
    connections: number
}

export interface PresenceSnapshot {
    onlineUsers: PresenceUser[]
    totalConnections: number
    updatedAt: string
}
