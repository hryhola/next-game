import { Resulted } from 'util/universalTypes'
import { getCookie } from 'cookies-next'
import { HTTPEndpointName as EndpointName, HTTPEndpoints as Endpoints } from 'shared/contracts'
import { gameInitialDataSchemas, supportedGameNames } from 'shared/contracts/app'
import { getCloudflareRealtimeApiUrl } from './realtimeMode'
import { getWorkerErrorMessage, toAppGameData, toAppLobbyData } from './realtimeAdapter'

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

                if (!supportedGameNames.includes(request.gameName)) {
                    return [
                        {
                            success: false,
                            message: `The realtime API does not support ${request.gameName} yet`
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [
                    {
                        success: true,
                        gameName: request.gameName,
                        initialDataScheme: gameInitialDataSchemas[request.gameName]
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
                if (!lobbyId) {
                    return [
                        {
                            success: false,
                            message: 'Lobby ID is not valid'
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                if (!supportedGameNames.includes(gameName as (typeof supportedGameNames)[number])) {
                    return [
                        {
                            success: false,
                            message: `The realtime API does not support ${gameName} yet`
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                const response =
                    gameName === 'Jeopardy' || gameName === 'Clicker'
                        ? await fetch(getCloudflareRealtimeApiUrl('/lobbies'), {
                              method: 'POST',
                              headers: createWorkerAuthHeaders(null),
                              body: request
                          })
                        : await fetch(getCloudflareRealtimeApiUrl('/lobbies'), {
                              method: 'POST',
                              headers: createWorkerAuthHeaders(),
                              body: JSON.stringify({
                                  game: {
                                      kind: gameName,
                                      config: {}
                                  },
                                  name: lobbyId,
                                  password,
                                  lobbyId: lobbyId
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
                const response = await fetch(getCloudflareRealtimeApiUrl(`/lobbies/${encodeURIComponent(request.lobbyId)}/state`), {
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
                const snapshot = body.lobby

                return [
                    {
                        success: true,
                        game: toAppGameData(snapshot, body.sessionInternal || null),
                        lobby: toAppLobbyData(snapshot)
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

                const response = await fetch(getCloudflareRealtimeApiUrl('/auth/profile'), {
                    method: 'POST',
                    headers: createWorkerAuthHeaders(null),
                    body: request
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
        return handleWorkerApiRequest(endpoint, data)
    }
}

export const api = {
    post: createHandler('POST')
}
