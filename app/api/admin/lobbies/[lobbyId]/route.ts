import { getCloudflareRealtimeApiUrl } from 'client/network-utils/realtimeMode'
import { getAdminAuthorizationHeader } from 'client/server/adminAuth'

type Props = {
    params: Promise<{
        lobbyId: string
    }>
}

export async function DELETE(_request: Request, { params }: Props): Promise<Response> {
    const { lobbyId } = await params
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

    const response = await fetch(getCloudflareRealtimeApiUrl(`/admin/lobbies/${encodeURIComponent(lobbyId)}`), {
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
