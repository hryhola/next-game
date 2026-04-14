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

    if (body && typeof body === 'object') {
        const payload = body as {
            message?: unknown
            ok?: unknown
            success?: unknown
            summary?: unknown
        }

        if (payload.success === true || payload.ok === true) {
            return Response.json(
                {
                    success: true,
                    ...(payload.summary !== undefined
                        ? {
                              summary: payload.summary
                          }
                        : {})
                },
                {
                    status: response.status
                }
            )
        }

        if (typeof payload.message === 'string') {
            return Response.json(
                {
                    success: false,
                    message: payload.message
                },
                {
                    status: response.status
                }
            )
        }
    }

    return Response.json(
        response.ok
            ? {
                  success: true
              }
            : {
                  success: false,
                  message: 'Failed to purge old files'
              },
        {
            status: response.status
        }
    )
}
