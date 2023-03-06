import React, { useState, useEffect } from 'react'
import { useLobby, useEventHandler, useWS } from 'client/context/list'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { ClickerPlayerData } from 'state'
import PlayersHeader from '../common/PlayersHeader'
import { Failure, Success } from 'pages/api/lobby-join'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { ClickerCanvas } from './ClickerCanvas'
import { ClickerStartMenu } from './ClickerStartMenu'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'

export const ClickerContext = React.createContext({
    players: [] as ClickerPlayerData[],
    setPlayers: (() => {}) as React.Dispatch<React.SetStateAction<ClickerPlayerData[]>>
})

export const Clicker = () => {
    const lobby = useLobby()
    const ws = useWS()

    const [players, setPlayers] = useState<ClickerPlayerData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPlaying, setIsPlaying] = useState(false)

    useEventHandler('Clicker-Join', data => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname), data.player])
    })

    useEventHandler('Clicker-Leave', data => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname)])
    })

    useEventHandler('Clicker-Update', data => {
        setPlayers(data.updated.players)
    })

    useEventHandler('Clicker-SessionStart', ({ lobbyId }) => {
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

    return (
        <ClickerContext.Provider value={{ players, setPlayers }}>
            <PlayersHeader members={players} isLoading={isLoading} />
            <ClickerCanvas />
            <Dialog open={!isPlaying} sx={{ zIndex: 1 }} disableEnforceFocus>
                <Button onClick={() => ws.send('Game-Start', { lobbyId: lobby.lobbyId })}>Start game</Button>
            </Dialog>
            <LobbyControls />
        </ClickerContext.Provider>
    )
}

export const useClicker = () => {
    return React.useContext(ClickerContext)
}
