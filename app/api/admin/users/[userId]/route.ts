import { getCloudflareRealtimeApiUrl } from 'client/network-utils/realtimeMode'
import { getAdminAuthorizationHeader } from 'client/server/adminAuth'

type Props = {
    params: Promise<{
        userId: string
    }>
}

export async function DELETE(_request: Request, { params }: Props): Promise<Response> {
    const { userId } = await params
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

    const response = await fetch(getCloudflareRealtimeApiUrl(`/admin/users/${encodeURIComponent(userId)}`), {
        method: 'DELETE',
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
