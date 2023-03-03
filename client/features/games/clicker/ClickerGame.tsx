import React, { useState, useEffect } from 'react'
import { useLobby, useEventHandler } from 'client/context/list'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { ClickerPlayerData } from 'state'
import PlayersHeader from '../common/PlayersHeader'
import { Failure, Success } from 'pages/api/lobby-join'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'

export const ClickerContext = React.createContext({
    players: [] as ClickerPlayerData[],
    setPlayers: (() => {}) as React.Dispatch<React.SetStateAction<ClickerPlayerData[]>>
})

export const Clicker = () => {
    const lobby = useLobby()

    const [players, setPlayers] = useState<ClickerPlayerData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEventHandler('Clicker-Join', data => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname), data.player])
    })

    useEventHandler('Clicker-Leave', data => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname)])
    })

    useEventHandler('Clicker-Update', data => {
        setPlayers(data.updated.players)
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

    return (
        <ClickerContext.Provider value={{ players, setPlayers }}>
            <PlayersHeader members={players} isLoading={isLoading} />
            <LobbyControls />
        </ClickerContext.Provider>
    )
}
