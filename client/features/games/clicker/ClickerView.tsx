import React from 'react'
import { Dialog, Button } from '@mui/material'
import { useLobby, useWS } from 'client/context/list'
import PlayersHeader from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { ClickerCanvas } from './ClickerCanvas'
import { createGame } from '../common/GameCtx'
import { ClickerPlayerData, ClickerSessionData } from 'state'

type ClickerCtx = {
    players: ClickerPlayerData[]
    session: ClickerSessionData | null
}

export const [ClickerView, useClicker] = createGame<ClickerCtx>(({ players, isLoading, isSessionStarted }) => {
    const lobby = useLobby()
    const ws = useWS()

    return (
        <>
            <PlayersHeader members={players} isLoading={isLoading} />
            <ClickerCanvas />
            <Dialog open={!isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
                <Button onClick={() => ws.send('Game-Start', { lobbyId: lobby.lobbyId })}>Start game</Button>
            </Dialog>
            <LobbyControls />
        </>
    )
})
