import { cookies, headers } from 'next/headers'
import type { IdentitySession, RealtimeLobbyListItem, RealtimeLobbySnapshot } from 'shared/contracts'
import type { AdminLobbyListItem, AdminUserListItem } from 'shared/contracts/http-api'
import { getCloudflareRealtimeApiUrl } from 'client/network-utils/realtimeMode'
import { getAdminAuthorizationHeader } from 'client/server/adminAuth'
import { toAppLobbyData } from 'client/network-utils/realtimeAdapter'
import type { LobbyData, UserData } from 'shared/contracts/app'

type JsonValue = Record<string, unknown>

type AdminStateWorkerResponse = {
    lobbies?: AdminLobbyListItem[]
    ok?: boolean
    users?: AdminUserListItem[]
}

function sanitizeForClient<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

async function getRequestOrigin(): Promise<string | undefined> {
    const headerStore = await headers()
    const protocol = headerStore.get('x-forwarded-proto') || 'http'
    const host = headerStore.get('x-forwarded-host') || headerStore.get('host')

    if (!host) {
        return undefined
    }

    return `${protocol}://${host}`
}

async function getSessionToken() {
    return (await cookies()).get('token')?.value
}

async function readJson<T extends JsonValue>(pathname: string, token?: string, init?: RequestInit): Promise<T | null> {
    const requestHeaders = new Headers(init?.headers)

    if (token) {
        requestHeaders.set('authorization', `Bearer ${token}`)
    }

    const response = await fetch(getCloudflareRealtimeApiUrl(pathname, await getRequestOrigin()), {
        ...init,
        headers: requestHeaders,
        cache: 'no-store'
    })

    if (!response.ok) {
        return null
    }

    return (await response.json()) as T
}

export async function getCurrentSession(): Promise<IdentitySession | null> {
    const token = await getSessionToken()

    if (!token) {
        return null
    }

    const response = await readJson<{ session?: IdentitySession }>('/auth/session', token)

    return response?.session || null
}

export async function getLobbySnapshot(lobbyId: string): Promise<RealtimeLobbySnapshot | null> {
    const token = await getSessionToken()

    if (!token) {
        return null
    }

    const response = await readJson<{ lobby?: RealtimeLobbySnapshot }>(`/lobbies/${encodeURIComponent(lobbyId)}/state`, token)

    return response?.lobby || null
}

export async function findActiveLobbySnapshot(token?: string): Promise<RealtimeLobbySnapshot | null> {
    const sessionToken = token || (await getSessionToken())

    if (!sessionToken) {
        return null
    }

    const session = await getCurrentSession()

    if (!session) {
        return null
    }

    const lobbiesResponse = await readJson<{ lobbies?: RealtimeLobbyListItem[] }>('/lobbies', sessionToken)
    const lobbies = lobbiesResponse?.lobbies || []

    for (const lobby of lobbies) {
        const lobbyResponse = await readJson<{ lobby?: RealtimeLobbySnapshot }>(`/lobbies/${encodeURIComponent(lobby.id)}/state`, sessionToken)
        const lobbySnapshot = lobbyResponse?.lobby

        if (lobbySnapshot?.members.some(member => member.id === session.user.id)) {
            return lobbySnapshot
        }
    }

    return null
}

export async function getRouteBootstrap(): Promise<{ user?: UserData; activeLobby?: LobbyData }> {
    const session = await getCurrentSession()

    if (!session) {
        return {}
    }

    const activeLobby = await findActiveLobbySnapshot()

    return sanitizeForClient({
        user: {
            ...session.user,
            userIsOnline: true
        },
        ...(activeLobby
            ? {
                  activeLobby: toAppLobbyData(activeLobby)
              }
            : {})
    })
}

export async function getLobbyBootstrap(lobbyId: string): Promise<{
    user?: UserData
    lobby?: LobbyData
    isMember: boolean
}> {
    const session = await getCurrentSession()

    if (!session) {
        return {
            isMember: false
        }
    }

    const snapshot = await getLobbySnapshot(lobbyId)

    if (!snapshot) {
        return {
            user: sanitizeForClient({
                ...session.user,
                userIsOnline: true
            }),
            isMember: false
        }
    }

    return sanitizeForClient({
        user: {
            ...session.user,
            userIsOnline: true
        },
        lobby: toAppLobbyData(snapshot),
        isMember: snapshot.members.some(member => member.id === session.user.id)
    })
}

export async function getAdminBootstrap() {
    const authorization = getAdminAuthorizationHeader()

    if (!authorization) {
        return sanitizeForClient({
            isAuthenticated: false,
            lobbies: [] as AdminLobbyListItem[],
            users: [] as AdminUserListItem[]
        })
    }

    const response = await readJson<AdminStateWorkerResponse>('/admin/state', undefined, {
        headers: {
            authorization
        }
    })

    return sanitizeForClient({
        isAuthenticated: Boolean(response?.ok),
        lobbies: response?.ok ? response.lobbies || [] : [],
        users: response?.ok ? response.users || [] : []
    })
}
