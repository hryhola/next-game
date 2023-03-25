import React, { useEffect } from 'react'
import { PlayerData, GameSessionData, GameName } from 'state'
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

export const createGame = <GameInstanceCtx extends Partial<GameCtxValue>>(Component: React.ComponentType<GameCtxValue & GameInstanceCtx>) => {
    type GameInstanceValue = GameCtxValue & GameInstanceCtx

    const GameComponent = () => {
        type GameInstancePlayerData = PlayerData & GameInstanceCtx['players']
        type GameInstanceSessionData = GameSessionData & GameInstanceCtx['session']

        const lobby = useLobby()

        const [players, setPlayers] = React.useState<GameInstancePlayerData[]>([])
        const [isLoading, setIsLoading] = React.useState(true)
        const [session, setSession] = React.useState<GameInstanceSessionData | null>(null)

        useEventHandler('Game-Join', data => {
            setPlayers(ps => [...ps.filter(p => p.id !== data.player.id), data.player as GameInstancePlayerData])
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

                setPlayers(response.game.players as GameInstancePlayerData[])
                setIsLoading(false)

                if (response.game.session) setSession(response.game.session)
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
                <GameCtx.Consumer>{ctx => <Component {...(ctx as GameInstanceValue)} />}</GameCtx.Consumer>
            </GameCtx.Provider>
        )
    }

    const useGame = () => {
        const ctx = React.useContext(GameCtx)

        if (!ctx) {
            throw new Error('useGame must be used within a GameCtxProvider')
        }

        return ctx as GameInstanceValue
    }

    return [GameComponent, useGame] as const
}

export const useGame = () => {
    const ctx = React.useContext(GameCtx)

    if (!ctx) {
        throw new Error('useGame must be used within a GameCtxProvider')
    }

    return ctx
}
