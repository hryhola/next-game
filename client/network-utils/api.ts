import { Resulted } from 'util/universalTypes'
import { getCookie } from 'cookies-next'
import { HTTPEndpointName as EndpointName, HTTPEndpoints as Endpoints } from 'shared/contracts'
import { gameInitialDataSchemas, supportedGameNames } from 'shared/contracts/app'
import { validateJeopardyPackCompatibility, type ParsedJeopardyPack } from 'shared/lib/jeopardyPack'
import { uploadJeopardyPackFile, validateJeopardyPackFile } from './jeopardyPack'
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

function readParsedJeopardyPack(formData: FormData): ParsedJeopardyPack | null {
    const value = formData.get('jeopardyParsedPack')

    if (typeof value !== 'string' || !value.trim()) {
        return null
    }

    try {
        const parsed = JSON.parse(value) as Partial<ParsedJeopardyPack>

        if (
            !parsed ||
            typeof parsed.author !== 'string' ||
            typeof parsed.dateCreated !== 'string' ||
            typeof parsed.packName !== 'string' ||
            !parsed.declaration
        ) {
            return null
        }

        return parsed as ParsedJeopardyPack
    } catch (_error) {
        return null
    }
}

async function handleWorkerApiRequest<E extends EndpointName>(endpoint: E, data: Endpoints[E]['request']): Promise<Resulted<Endpoints[E]['response']>> {
    try {
        switch (endpoint) {
            case 'admin-asset-purge': {
                const response = await fetch('/api/admin/assets/purge', {
                    method: 'POST'
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, 'Failed to purge old files')
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                return [(await response.json()) as Endpoints[E]['response'], undefined]
            }
            case 'admin-user-destroy': {
                const request = data as Endpoints['admin-user-destroy']['request']
                const response = await fetch(`/api/admin/users/${encodeURIComponent(request.userId)}`, {
                    method: 'DELETE'
                })

                if (!response.ok) {
                    return [
                        {
                            success: false,
                            message: await getWorkerErrorMessage(response, 'Failed to destroy user')
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
            case 'admin-lobby-destroy': {
                const request = data as Endpoints['admin-lobby-destroy']['request']
                const response = await fetch(`/api/admin/lobbies/${encodeURIComponent(request.lobbyId)}`, {
                    method: 'DELETE'
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
                    gameName === 'Jeopardy'
                        ? await (async () => {
                              const packFile = request.get('initialData-pack')

                              if (!(packFile instanceof File) || !packFile.size || !packFile.name.trim()) {
                                  return new Response(JSON.stringify({ message: 'Jeopardy pack is required', ok: false }), {
                                      headers: {
                                          'content-type': 'application/json'
                                      },
                                      status: 400
                                  })
                              }

                              const preParsedPack = readParsedJeopardyPack(request)
                              const parsedPack = preParsedPack || (await validateJeopardyPackFile(packFile)).parsedPack
                              const compatibility = validateJeopardyPackCompatibility(parsedPack.declaration)

                              if (!compatibility.compatible) {
                                  return new Response(JSON.stringify({ message: compatibility.reason, ok: false }), {
                                      headers: {
                                          'content-type': 'application/json'
                                      },
                                      status: 400
                                  })
                              }

                              const storedPack = await uploadJeopardyPackFile(packFile, lobbyId)

                              return fetch(getCloudflareRealtimeApiUrl('/lobbies'), {
                                  method: 'POST',
                                  headers: createWorkerAuthHeaders(),
                                  body: JSON.stringify({
                                      game: {
                                          kind: 'Jeopardy',
                                          config: {
                                              pack: {
                                                  public: true,
                                                  value: storedPack.url
                                              },
                                              packAssetId: storedPack.id,
                                              packAuthor: parsedPack.author,
                                              packDateCreated: parsedPack.dateCreated,
                                              packDeclaration: parsedPack.declaration,
                                              packFileName: storedPack.fileName
                                          }
                                      },
                                      lobbyId,
                                      name: lobbyId,
                                      password
                                  })
                              })
                          })()
                        : gameName === 'Clicker'
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
            case 'jeopardy-validate-pack': {
                const request = data as Endpoints['jeopardy-validate-pack']['request']

                if (!(request instanceof FormData)) {
                    return [undefined, new Error('Jeopardy pack validation payload must be FormData')]
                }

                const packFile = request.get('pack')

                if (!(packFile instanceof File) || !packFile.size || !packFile.name.trim()) {
                    return [
                        {
                            success: false,
                            message: 'Jeopardy pack is required'
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }

                try {
                    const { compatibility } = await validateJeopardyPackFile(packFile)

                    return [
                        {
                            success: true,
                            compatible: compatibility.compatible,
                            reason: compatibility.compatible ? undefined : compatibility.reason
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                } catch (error) {
                    return [
                        {
                            success: false,
                            message: error instanceof Error ? error.message : 'Failed to validate Jeopardy pack'
                        } as Endpoints[E]['response'],
                        undefined
                    ]
                }
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
                        user: body.session?.user
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
