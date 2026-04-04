import React, { useEffect } from 'react'
import { useLobby, useEventHandler, useI18n, useWS } from 'client/context/list'
import { api } from 'client/network-utils/api'
import type { GameActionMap, GameActionName, GameActionPayload, TypedGameActionEvent } from 'shared/contracts/game-actions'
import type { GameName, PlayerData } from 'shared/contracts/app'
import { LoadingOverlay } from 'client/ui'

export type GameCtxValue = {
    players: PlayerData[]
    isLoading: boolean
    isSessionStarted: boolean
    session: unknown | null
    initialData?: unknown
}

export const GameCtx = React.createContext<GameCtxValue | null>(null)

export const createGame = <
    ThisPlayerData extends PlayerData,
    ThisSessionData,
    ThisInitialData extends object,
    ThisActionMap extends GameActionMap = GameActionMap
>(
    Component: React.ComponentType<{}>
) => {
    type ThisGameCtxValue = {
        players: ThisPlayerData[]
        isLoading: boolean
        isSessionStarted: boolean
        session: ThisSessionData | null
        initialData: ThisInitialData
    }

    const GameComponent = () => {
        const lobby = useLobby()
        const { t } = useI18n()

        const [players, setPlayers] = React.useState<ThisPlayerData[]>([])
        const [isLoading, setIsLoading] = React.useState(true)
        const [session, setSession] = React.useState<ThisSessionData | null>(null)
        const [initialData, setInitialData] = React.useState<ThisInitialData>({} as ThisInitialData)
        const hasHydratedFromLiveSnapshotRef = React.useRef(false)

        useEventHandler('Game-Join', data => {
            setPlayers(ps => [...ps.filter(p => p.id !== data.player.id), data.player as ThisPlayerData])
        })

        useEventHandler('Game-Leave', data => {
            setPlayers(ps => [...ps.filter(p => p.id !== data.player.id)])
        })

        useEventHandler('Game-PlayerUpdate', data => {
            setPlayers(ps =>
                ps.map(player =>
                    player.id === data.id
                        ? {
                              ...player,
                              ...data.data
                          }
                        : player
                )
            )
        })

        useEventHandler('Lobby-MemberUpdate', data => {
            if (data.lobbyId !== lobby.lobbyId || !data.data.id) {
                return
            }

            setPlayers(ps =>
                ps.map(player =>
                    player.id === data.data.id
                        ? {
                              ...player,
                              ...data.data
                          }
                        : player
                )
            )
        })

        useEventHandler('Lobby-Snapshot', data => {
            if (data.lobbyId !== lobby.lobbyId) {
                return
            }

            hasHydratedFromLiveSnapshotRef.current = true
            setInitialData(data.game.initialData as ThisInitialData)
            setPlayers(data.game.players as ThisPlayerData[])
            setSession((data.game.session ?? null) as ThisSessionData | null)
            setIsLoading(false)
        })

        useEventHandler('Game-SessionStart', ({ lobbyId, session }) => {
            if (lobbyId === lobby.lobbyId) {
                setSession(session as ThisSessionData)
            }
        })

        useEventHandler('Game-SessionEnd', ({ lobbyId }) => {
            if (lobbyId === lobby.lobbyId) {
                setSession(null)
            }
        })

        useEventHandler('Game-SessionUpdate', ({ lobbyId, data }) => {
            if (lobbyId === lobby.lobbyId) {
                setSession(prev => ({ ...(prev as object | null), ...(data as object) }) as ThisSessionData)
            }
        })

        useEffect(() => {
            ;(async () => {
                const [response, postError] = await api
                    .post('lobby-data', {
                        lobbyId: lobby.lobbyId
                    })
                    .finally(() => setIsLoading(false))

                if (!response || !response.success) {
                    return console.error(response ? response.message : postError)
                }

                if (hasHydratedFromLiveSnapshotRef.current) {
                    return
                }

                lobby.setMembers(response.lobby.members)
                lobby.setGameName(response.game.name as GameName)

                setInitialData(response.game.initialData as ThisInitialData)
                setPlayers(response.game.players as ThisPlayerData[])

                if (response.game.session) setSession(response.game.session as ThisSessionData)
            })()
        }, [])

        const game = {
            players,
            isLoading,
            isSessionStarted: session !== null,
            session,
            initialData
        }

        return (
            <GameCtx.Provider value={game as GameCtxValue}>
                <GameCtx.Consumer>
                    {() => (
                        <>
                            <Component />
                            <LoadingOverlay isLoading={isLoading} text={t('common.loading')} />
                        </>
                    )}
                </GameCtx.Consumer>
            </GameCtx.Provider>
        )
    }

    const useGame = () => {
        const ctx = React.useContext(GameCtx)

        if (!ctx) {
            throw new Error('useGame must be used within a GameCtxProvider')
        }

        return ctx as ThisGameCtxValue
    }

    const useActionHandler = <T extends GameActionName<ThisActionMap>>(name: T, handler: (data: TypedGameActionEvent<ThisActionMap, T>) => void) => {
        const lobby = useLobby()
        const lobbyRef = React.useRef(lobby)

        useEffect(() => {
            lobbyRef.current = lobby
        }, [lobby])

        useEventHandler('Game-SessionAction', data => {
            if (!lobbyRef.current || data.lobbyId !== lobbyRef.current.lobbyId || data.type !== name) {
                return
            }

            handler(data as TypedGameActionEvent<ThisActionMap, T>)
        })
    }

    const useActionSender = () => {
        const ws = useWS()
        const lobby = useLobby()

        const wsRef = React.useRef(ws)
        const lobbyRef = React.useRef(lobby)

        useEffect(() => {
            wsRef.current = ws
        }, [ws])

        useEffect(() => {
            lobbyRef.current = lobby
        }, [lobby])

        return <T extends GameActionName<ThisActionMap>>(name: T, payload: GameActionPayload<ThisActionMap, T>) => {
            if (!wsRef.current || !lobbyRef.current) {
                console.error('ws or lobby is not defined')

                return
            }

            wsRef.current.send('Game-SendAction', {
                lobbyId: lobbyRef.current.lobbyId,
                actionName: name as string,
                actionPayload: payload
            })
        }
    }

    return [GameComponent, useGame, useActionHandler, useActionSender] as const
}

export const useGame = () => {
    const ctx = React.useContext(GameCtx)

    if (!ctx) {
        throw new Error('useGame must be used within a GameCtxProvider')
    }

    return ctx
}
