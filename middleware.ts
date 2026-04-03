import { NextResponse, type NextRequest } from 'next/server'
import { getAdminCredentialsFromEnv } from 'client/server/adminAuth'
import { matchesBasicAuthHeader } from 'shared/lib/basicAuth'

function createAuthChallengeResponse(message: string, status = 401): NextResponse {
    const response = new NextResponse(message, {
        status
    })

    response.headers.set('WWW-Authenticate', 'Basic realm="Admin", charset="UTF-8"')

    return response
}

export function middleware(request: NextRequest) {
    const credentials = getAdminCredentialsFromEnv()

    if (!credentials) {
        return createAuthChallengeResponse('Admin credentials are not configured', 503)
    }

    if (!matchesBasicAuthHeader(request.headers.get('authorization'), credentials)) {
        return createAuthChallengeResponse('Authentication required')
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin', '/admin/:path*', '/api/admin/:path*']
}
