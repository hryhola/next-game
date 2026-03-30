import { cookies, headers } from 'next/headers'
import type { IdentitySession, RealtimeLobbyListItem, RealtimeLobbySnapshot } from 'shared/contracts'
import { getCloudflareRealtimeApiUrl } from 'client/network-utils/realtimeMode'
import { toAppLobbyData } from 'client/network-utils/realtimeAdapter'
import type { LobbyData, UserData } from 'state'

type JsonValue = Record<string, unknown>

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

    const response = await readJson<{ room?: RealtimeLobbySnapshot }>(`/rooms/${encodeURIComponent(lobbyId)}/state`, token)

    return response?.room || null
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
        const roomResponse = await readJson<{ room?: RealtimeLobbySnapshot }>(`/rooms/${encodeURIComponent(lobby.id)}/state`, sessionToken)
        const room = roomResponse?.room

        if (room?.members.some(member => member.id === session.user.id)) {
            return room
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
    const token = await getSessionToken()

    return sanitizeForClient({
        generatedAt: new Date().toISOString(),
        health: await readJson('/health'),
        session: await readJson('/auth/session', token),
        presence: await readJson('/presence/state', token),
        lobbies: await readJson('/lobbies', token)
    })
}
