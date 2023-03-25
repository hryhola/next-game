import React from 'react'
import { Dialog, Button } from '@mui/material'
import { useLobby, useWS } from 'client/context/list'
import PlayersHeader from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { ClickerCanvas } from './ClickerCanvas'
import { createGame } from '../common/GameCtx'
import { Clicker } from 'state'

export const [ClickerView, useClicker, useClickerAction, useActionSender] = createGame<Clicker>(() => {
    const game = useClicker()
    const lobby = useLobby()
    const ws = useWS()

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <ClickerCanvas />
            <Dialog open={!game.isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
                <Button onClick={() => ws.send('Game-Start', { lobbyId: lobby.lobbyId })}>Start game</Button>
            </Dialog>
            <LobbyControls />
        </>
    )
})
