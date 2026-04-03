import { buildBasicAuthHeader } from 'shared/lib/basicAuth'

export function getAdminCredentialsFromEnv() {
    const username = process.env.ADMIN_USERNAME?.trim()
    const password = process.env.ADMIN_PASSWORD?.trim()

    if (!username || !password) {
        return null
    }

    return {
        password,
        username
    }
}

export function getAdminAuthorizationHeader(): string | null {
    const credentials = getAdminCredentialsFromEnv()

    if (!credentials) {
        return null
    }

    return buildBasicAuthHeader(credentials)
}
