import React, { useEffect } from 'react'
import { PlayerData, GameSessionData, GameSessionActionsName, GameSessionAction, Game as AbstractGame } from 'state'
import { useLobby, useEventHandler } from 'client/context/list'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { Failure, Success } from 'pages/api/lobby-join'

export type GameCtxValue = {
    players: PlayerData[]
    isLoading: boolean
    isSessionStarted: boolean
    session: GameSessionData | null
}

export const GameCtx = React.createContext<GameCtxValue | null>(null)

export const createGame = <Game extends AbstractGame>(Component: React.ComponentType<{}>) => {
    type ThisPlayerData = ReturnType<Game['players'][0]['data']>
    type ThisSession = NonNullable<Game['currentSession']>
    type ThisSessionData = ReturnType<ThisSession['data']>

    type ThisGameCtxValue = {
        players: ThisPlayerData[]
        isLoading: boolean
        isSessionStarted: boolean
        session: ThisSessionData | null
    }

    const GameComponent = () => {
        const lobby = useLobby()

        const [players, setPlayers] = React.useState<ThisPlayerData[]>([])
        const [isLoading, setIsLoading] = React.useState(true)
        const [session, setSession] = React.useState<ThisSessionData | null>(null)

        useEventHandler('Game-Join', data => {
            setPlayers(ps => [...ps.filter(p => p.id !== data.player.id), data.player as ThisPlayerData])
        })

        useEventHandler('Game-Leave', data => {
            setPlayers(ps => [...ps.filter(p => p.id !== data.player.id)])
        })

        useEventHandler('Game-PlayerUpdate', data => {
            setPlayers(ps => {
                const index = ps.findIndex(p => p.id === data.id)

                if (index === -1) return ps

                Object.assign(ps[index], data.data)

                return ps
            })
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
                const [response, postError] = await api.post<Success | Failure>(URL.LobbyJoin, {
                    lobbyId: lobby.lobbyId
                })

                if (!response || !response.success) {
                    return console.error(String(postError))
                }

                lobby.setMembers(response.lobby.members)
                lobby.setGameName(response.game.name as 'Clicker')

                setPlayers(response.game.players as ThisPlayerData[])
                setIsLoading(false)

                if (response.game.session) setSession(response.game.session as ThisSessionData)
            })()
        }, [])

        const game = {
            players,
            isLoading,
            isSessionStarted: session !== null,
            session
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

    return [GameComponent, useGame, useActionHandler] as const
}

export const useGame = () => {
    const ctx = React.useContext(GameCtx)

    if (!ctx) {
        throw new Error('useGame must be used within a GameCtxProvider')
    }

    return ctx
}
