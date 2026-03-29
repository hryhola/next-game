export function isCloudflareRealtimeEnabled(): boolean {
    return process.env.NEXT_PUBLIC_USE_CLOUDFLARE_REALTIME === 'true'
}

export function getCloudflareRealtimeApiOrigin(currentOrigin?: string): string {
    const configuredOrigin = process.env.NEXT_PUBLIC_REALTIME_API_ORIGIN?.trim()
    const fallbackOrigin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '')
    const origin = configuredOrigin || fallbackOrigin

    if (!origin) {
        throw new Error('Cloudflare realtime API origin is not configured')
    }

    return origin.replace(/\/$/, '')
}

export function getCloudflareRealtimeApiUrl(pathname: string, currentOrigin?: string): string {
    return new URL(pathname, getCloudflareRealtimeApiOrigin(currentOrigin)).toString()
}

export function getCloudflareRoomWebSocketUrl(roomId: string, token?: string, currentOrigin?: string): string {
    const url = new URL(getCloudflareRealtimeApiUrl(`/rooms/${encodeURIComponent(roomId)}/websocket`, currentOrigin))

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
