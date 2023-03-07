import React, { useEffect } from 'react'
import { AbstractPlayerData } from 'state'
import { useLobby, useEventHandler } from 'client/context/list'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { Failure, Success } from 'pages/api/lobby-join'

export type GameCtxValue = {
    players: AbstractPlayerData[]
    setPlayers: React.Dispatch<React.SetStateAction<AbstractPlayerData[]>>
    isLoading: boolean
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
    isPlaying: boolean
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
}

export const GameCtx = React.createContext<GameCtxValue | null>(null)

export const withGameCtx = <P extends object>(Component: React.ComponentType<P & GameCtxValue>) => {
    return (props: P) => {
        const lobby = useLobby()

        const [players, setPlayers] = React.useState<AbstractPlayerData[]>([])
        const [isLoading, setIsLoading] = React.useState(true)
        const [isPlaying, setIsPlaying] = React.useState(false)

        useEventHandler('Game-Join', data => {
            setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname), data.player])
        })

        useEventHandler('Game-Leave', data => {
            setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname)])
        })

        useEventHandler('Game-Update', data => {
            setPlayers(data.updated.players)
        })

        useEventHandler('Game-SessionStart', ({ lobbyId }) => {
            if (lobbyId === lobby.lobbyId) {
                setIsPlaying(true)
            }
        })

        useEventHandler('Game-SessionEnd', ({ lobbyId }) => {
            if (lobbyId === lobby.lobbyId) {
                setIsPlaying(false)
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
            })()
        }, [])

        const game = {
            players,
            setPlayers,
            isLoading,
            setIsLoading,
            isPlaying,
            setIsPlaying
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
