export type BasicAuthCredentials = {
    password: string
    username: string
}

function encodeBase64(value: string): string {
    if (typeof globalThis.btoa === 'function') {
        return globalThis.btoa(value)
    }

    return Buffer.from(value, 'utf8').toString('base64')
}

function decodeBase64(value: string): string | null {
    try {
        if (typeof globalThis.atob === 'function') {
            return globalThis.atob(value)
        }

        return Buffer.from(value, 'base64').toString('utf8')
    } catch (_error) {
        return null
    }
}

export function buildBasicAuthHeader(credentials: BasicAuthCredentials): string {
    return `Basic ${encodeBase64(`${credentials.username}:${credentials.password}`)}`
}

export function parseBasicAuthHeader(headerValue?: string | null): BasicAuthCredentials | null {
    if (!headerValue || !headerValue.startsWith('Basic ')) {
        return null
    }

    const decoded = decodeBase64(headerValue.slice('Basic '.length).trim())

    if (!decoded) {
        return null
    }

    const separatorIndex = decoded.indexOf(':')

    if (separatorIndex < 0) {
        return null
    }

    return {
        password: decoded.slice(separatorIndex + 1),
        username: decoded.slice(0, separatorIndex)
    }
}

export function matchesBasicAuthHeader(headerValue: string | null | undefined, credentials: BasicAuthCredentials): boolean {
    const parsed = parseBasicAuthHeader(headerValue)

    if (!parsed) {
        return false
    }

    return parsed.username === credentials.username && parsed.password === credentials.password
}
