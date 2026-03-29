import { Resulted } from 'util/universalTypes'
import { getCookie } from 'cookies-next'
import { EndpointName, Endpoints } from './url'
import { getCloudflareRealtimeApiUrl, isCloudflareRealtimeEnabled } from './realtimeMode'
import { getWorkerErrorMessage, toLegacyGameData, toLegacyLobbyData } from './workerCompat'

function createWorkerAuthHeaders(contentType: 'json' | null = 'json'): Headers {
    const headers = new Headers()
    const token = getCookie('token')

    if (contentType === 'json') {
        headers.set('content-type', 'application/json')
    }

    if (typeof token === 'string' && token.length) {
        headers.set('authorization', `Bearer ${token}`)
    }

    return headers
}

async function handleWorkerApiRequest<E extends EndpointName>(endpoint: E, data: Endpoints[E]['request']): Promise<Resulted<Endpoints[E]['response']>> {
    try {
        switch (endpoint) {
            case 'game-get-schema': {
                const request = data as Endpoints['game-get-schema']['request']

                if (!['TicTacToe', 'Clicker'].includes(request.gameName)) {
                    return [
                        {
                            success: false,
                            message: `Cloudflare worker mode does not support ${request.gameName} yet`
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [
                    {
                        success: true,
                        gameName: request.gameName
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            case 'lobby-create': {
                const request = data as Endpoints['lobby-create']['request']

                if (!(request instanceof FormData)) {
                    return [undefined, new Error('Lobby create payload must be FormData')]
                }

                const lobbyId = String(request.get('lobbyId') || '').trim()
                const gameName = String(request.get('gameName') || '').trim()
                const password = String(request.get('password') || '').trim() || undefined
                const hasInitialData = Array.from(request.keys()).some(key => key.startsWith('initialData-'))

                if (!lobbyId) {
                    return [
                        {
                            success: false,
                            message: 'Lobby ID is not valid'
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                if (!['TicTacToe', 'Clicker'].includes(gameName)) {
                    return [
                        {
                            success: false,
                            message: `Cloudflare worker mode does not support ${gameName} yet`
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                if (hasInitialData) {
                    return [
                        {
                            success: false,
                            message: 'Initial game files are not supported in Cloudflare worker mode yet'
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                const response = await fetch(getCloudflareRealtimeApiUrl('/lobbies'), {
                    method: 'POST',
                    headers: createWorkerAuthHeaders(),
                    body: JSON.stringify({
                        gameName,
                        name: lobbyId,
                        password,
                        roomId: lobbyId
                    })
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, 'Error during lobby creation')
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [
                    {
                        success: true,
                        lobbyJoiningResult: {
                            success: true,
                            gameJoiningResult: {
                                success: true
                            }
                        }
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            case 'lobby-data': {
                const request = data as Endpoints['lobby-data']['request']
                const response = await fetch(getCloudflareRealtimeApiUrl(`/rooms/${encodeURIComponent(request.lobbyId)}/state`), {
                    method: 'GET',
                    headers: createWorkerAuthHeaders(null)
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, `Cannot lobby with id: ${request.lobbyId}`)
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                const body = await response.json()
                const snapshot = body.room

                return [
                    {
                        success: true,
                        game: toLegacyGameData(snapshot),
                        lobby: toLegacyLobbyData(snapshot)
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            case 'lobby-destroy': {
                const request = data as Endpoints['lobby-destroy']['request']
                const response = await fetch(getCloudflareRealtimeApiUrl(`/lobbies/${encodeURIComponent(request.lobbyId)}`), {
                    method: 'DELETE',
                    headers: createWorkerAuthHeaders(null)
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, 'Failed to destroy lobby')
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [
                    {
                        success: true
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            case 'lobby-join': {
                const request = data as Endpoints['lobby-join']['request']
                const response = await fetch(getCloudflareRealtimeApiUrl(`/lobbies/${encodeURIComponent(request.lobbyId)}/join`), {
                    method: 'POST',
                    headers: createWorkerAuthHeaders(),
                    body: JSON.stringify({
                        password: request.password,
                        role: request.joinAs
                    })
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, `Cannot lobby with id: ${request.lobbyId}`)
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [
                    {
                        success: true,
                        gameJoiningResult:
                            request.joinAs === 'player'
                                ? {
                                      success: true
                                  }
                                : null
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            case 'lobby-leave': {
                const request = data as Endpoints['lobby-leave']['request']
                const response = await fetch(getCloudflareRealtimeApiUrl(`/lobbies/${encodeURIComponent(request.lobbyId)}/leave`), {
                    method: 'POST',
                    headers: createWorkerAuthHeaders(),
                    body: JSON.stringify({})
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, `Cannot lobby with id: ${request.lobbyId}`)
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [
                    {
                        success: true
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            case 'profile': {
                const request = data as Endpoints['profile']['request']

                if (!(request instanceof FormData)) {
                    return [undefined, new Error('Profile payload must be FormData')]
                }

                const image = request.get('image')

                if (image instanceof File && image.size > 0) {
                    return [
                        {
                            success: false,
                            message: 'Avatar uploads are not supported in Cloudflare worker mode yet'
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                const response = await fetch(getCloudflareRealtimeApiUrl('/auth/profile'), {
                    method: 'POST',
                    headers: createWorkerAuthHeaders(),
                    body: JSON.stringify({
                        userColor: String(request.get('userColor') || '').trim() || undefined,
                        userNickname: String(request.get('userNickname') || '').trim() || undefined
                    })
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, 'Failed to update profile')
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                const body = await response.json()

                return [
                    {
                        success: true,
                        userAvatarUrl: body.session?.user?.userAvatarUrl
                    } as Endpoints[E]['response'],
                    undefined
                ]
            }
            default: {
                return [undefined, new Error(`Worker mode is not implemented for endpoint ${endpoint}`)]
            }
        }
    } catch (error) {
        return [undefined, error]
    }
}

const createHandler = (method: string) => {
    return async function <E extends EndpointName>(endpoint: E, data: Endpoints[E]['request']): Promise<Resulted<Endpoints[E]['response']>> {
        if (isCloudflareRealtimeEnabled()) {
            return handleWorkerApiRequest(endpoint, data)
        }

        const req: RequestInit = {
            method
        }

        if (data) {
            req.body = typeof data === 'string' || data instanceof FormData ? data : JSON.stringify(data)
        }

        var url = `${location.origin}/api/${endpoint}`

        try {
            const response = await fetch(url, req)
            const data = await response.json()

            return [data as Endpoints[E]['response'], undefined]
        } catch (e) {
            return [undefined, e]
        }
    }
}

export const api = {
    post: createHandler('POST')
}
