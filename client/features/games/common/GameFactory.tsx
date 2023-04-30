import React, { useEffect } from 'react'
import { PlayerData, GameSessionData, GameSessionActionsName, GameSessionAction, Game as AbstractGame } from 'state'
import { useLobby, useEventHandler, useWS } from 'client/context/list'
import { api } from 'client/network-utils/api'
import { InitialGameData } from 'state/common/game/GameInitialData'

export type GameCtxValue = {
    players: PlayerData[]
    isLoading: boolean
    isSessionStarted: boolean
    session: GameSessionData | null
    initialData?: InitialGameData
}

export const GameCtx = React.createContext<GameCtxValue | null>(null)

export const createGame = <Game extends AbstractGame>(Component: React.ComponentType<{}>) => {
    type ThisPlayerData = ReturnType<Game['players'][0]['data']>
    type ThisSession = NonNullable<Game['currentSession']>
    type ThisSessionData = ReturnType<ThisSession['data']>
    type ThisInitialData = Game['initialData']

    type ThisGameCtxValue = {
        players: ThisPlayerData[]
        isLoading: boolean
        isSessionStarted: boolean
        session: ThisSessionData | null
        initialData: ThisInitialData
    }

    const GameComponent = () => {
        const lobby = useLobby()

        const [players, setPlayers] = React.useState<ThisPlayerData[]>([])
        const [isLoading, setIsLoading] = React.useState(true)
        const [session, setSession] = React.useState<ThisSessionData | null>(null)
        const [initialData, setInitialData] = React.useState<ThisInitialData>({})

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

        useEventHandler('Game-SessionStart', ({ lobbyId, session }) => {
            if (lobbyId === lobby.lobbyId) {
                setSession(session)
            }
        })

        useEventHandler('Game-SessionEnd', ({ lobbyId }) => {
            if (lobbyId === lobby.lobbyId) {
                setSession(null)
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

                lobby.setMembers(response.lobby.members)
                lobby.setGameName(response.game.name as 'Clicker')

                setInitialData(response.game.initialData)
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
            <GameCtx.Provider value={game}>
                <GameCtx.Consumer>{() => <Component />}</GameCtx.Consumer>
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

    type SessionActionName = GameSessionActionsName<ThisSession>

    type SessionAction<ActionName extends SessionActionName = SessionActionName> = GameSessionAction<ThisSession, ActionName>

    type SessionActionPayload<ActionName extends SessionActionName> = SessionAction<ActionName>['payload']

    const useActionHandler = <T extends SessionActionName>(name: T, handler: (data: SessionAction<T>) => void) => {
        const lobby = useLobby()
        const lobbyRef = React.useRef(lobby)

        useEffect(() => {
            lobbyRef.current = lobby
        }, [lobby])

        useEventHandler('Game-SessionAction', data => {
            if (!lobbyRef.current || data.lobbyId !== lobbyRef.current.lobbyId || data.type !== name) {
                return
            }

            handler(data as unknown as SessionAction<T>)
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

        return <T extends SessionActionName>(name: T, payload: SessionActionPayload<T>) => {
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
