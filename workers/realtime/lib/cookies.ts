import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '../auth/constants'

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
    if (!cookieHeader) {
        return {}
    }

    return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
        const [key, ...rest] = part.trim().split('=')

        if (!key || rest.length === 0) {
            return acc
        }

        acc[key] = decodeURIComponent(rest.join('='))

        return acc
    }, {})
}

export function readCookie(request: Request, key: string): string | null {
    const cookies = parseCookieHeader(request.headers.get('cookie'))

    return cookies[key] || null
}

export function readSessionToken(request: Request): string | null {
    const urlToken = new URL(request.url).searchParams.get('token')

    if (urlToken) {
        return urlToken
    }

    const authorization = request.headers.get('authorization')

    if (authorization?.startsWith('Bearer ')) {
        return authorization.slice('Bearer '.length).trim() || null
    }

    return readCookie(request, SESSION_COOKIE_NAME)
}

export function createSessionCookie(token: string): string {
    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
}

export function clearSessionCookie(): string {
    return `${SESSION_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`
}
