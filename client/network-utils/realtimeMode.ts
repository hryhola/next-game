import type { IncomingHttpHeaders } from 'http'

export function isCloudflareRealtimeEnabled(): boolean {
    return true
}

function readForwardedHeader(value?: string | string[]): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value

    if (!raw) {
        return undefined
    }

    return raw
        .split(',')
        .map(part => part.trim())
        .find(Boolean)
}

export function getRequestOrigin(headers: IncomingHttpHeaders): string | undefined {
    const protocol = readForwardedHeader(headers['x-forwarded-proto']) || 'http'
    const host = readForwardedHeader(headers['x-forwarded-host']) || readForwardedHeader(headers.host)

    if (!host) {
        return undefined
    }

    return `${protocol}://${host}`
}

export function getCloudflareRealtimeApiOrigin(currentOrigin?: string): string {
    const configuredOrigin = process.env.NEXT_PUBLIC_REALTIME_API_ORIGIN?.trim()
    const fallbackOrigin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '')
    const origin = configuredOrigin || fallbackOrigin

    if (!origin) {
        throw new Error('Realtime API origin is not configured')
    }

    return origin.replace(/\/$/, '')
}

export function getCloudflareRealtimeApiUrl(pathname: string, currentOrigin?: string): string {
    return new URL(pathname, getCloudflareRealtimeApiOrigin(currentOrigin)).toString()
}

export function getCloudflareLobbyWebSocketUrl(lobbyId: string, token?: string, currentOrigin?: string): string {
    const url = new URL(getCloudflareRealtimeApiUrl(`/lobbies/${encodeURIComponent(lobbyId)}/websocket`, currentOrigin))

    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    if (token) {
        url.searchParams.set('token', token)
    }

    return url.toString()
}

export function getCloudflareGlobalWebSocketUrl(token?: string, currentOrigin?: string): string {
    const url = new URL(getCloudflareRealtimeApiUrl('/presence/websocket', currentOrigin))

    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    if (token) {
        url.searchParams.set('token', token)
    }

    return url.toString()
}
