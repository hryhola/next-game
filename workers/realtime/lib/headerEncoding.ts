const ENCODED_HEADER_PREFIX = 'x-next-game-v1:'

export function encodeHeaderValue(value: string): string {
    return `${ENCODED_HEADER_PREFIX}${encodeURIComponent(value)}`
}

export function decodeHeaderValue(value: string | null): string | null {
    if (!value) {
        return null
    }

    if (!value.startsWith(ENCODED_HEADER_PREFIX)) {
        return value
    }

    try {
        return decodeURIComponent(value.slice(ENCODED_HEADER_PREFIX.length))
    } catch (_error) {
        return null
    }
}
