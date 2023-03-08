import React, { useEffect } from 'react'
import { AbstractPlayerData } from 'state'
import { useLobby, useEventHandler } from 'client/context/list'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { Failure, Success } from 'pages/api/lobby-join'

export type GameCtxValue = {
    players: AbstractPlayerData[]
    isLoading: boolean
    isSessionStarted: boolean
    session: any | null
}

export const GameCtx = React.createContext<GameCtxValue | null>(null)

export const withGameCtx = <P extends object>(Component: React.ComponentType<P & GameCtxValue>) => {
    return (props: P) => {
        const lobby = useLobby()

        const [players, setPlayers] = React.useState<AbstractPlayerData[]>([])
        const [isLoading, setIsLoading] = React.useState(true)
        const [session, setSession] = React.useState<Record<string, any> | null>(null)

        useEventHandler('Game-Join', data => {
            setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname), data.player])
        })

        useEventHandler('Game-Leave', data => {
            setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname)])
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

                setPlayers(response.game.players)
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
                <GameCtx.Consumer>{ctx => <Component {...props} {...ctx!} />}</GameCtx.Consumer>
            </GameCtx.Provider>
        )
    }
}

export const useGame = () => {
    const ctx = React.useContext(GameCtx)

    if (!ctx) {
        throw new Error('useGame must be used within a GameCtxProvider')
    }

    return ctx
}
