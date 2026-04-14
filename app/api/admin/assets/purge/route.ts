import { getCloudflareRealtimeApiUrl } from 'client/network-utils/realtimeMode'
import { getAdminAuthorizationHeader } from 'client/server/adminAuth'

export async function POST(): Promise<Response> {
    const authorization = getAdminAuthorizationHeader()

    if (!authorization) {
        return Response.json(
            {
                message: 'Admin credentials are not configured',
                success: false
            },
            { status: 503 }
        )
    }

    const response = await fetch(getCloudflareRealtimeApiUrl('/admin/assets/purge'), {
        method: 'POST',
        headers: {
            authorization
        },
        cache: 'no-store'
    })

    const body = await response.json().catch(() => null)

    return Response.json(body || { success: response.ok }, {
        status: response.status
    })
}
