import { Button, Dialog } from '@mui/material'
import React from 'react'
import { TicTacToeCanvas } from './TicTacToeCanvas'
import { useLobby, useWS } from 'client/context/list'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import PlayersHeader from '../common/PlayersHeader'
import { createGame } from '../common/GameFactory'
import { TicTacToe } from 'state'

export const [TicTacToeView, useTicTacToe, useTicTacToeAction, useActionSender] = createGame<TicTacToe>(() => {
    const game = useTicTacToe()
    const lobby = useLobby()
    const ws = useWS()

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <TicTacToeCanvas />
            <Dialog open={!game.isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
                <Button onClick={() => ws.send('Game-Start', { lobbyId: lobby.lobbyId })}>Start game</Button>
            </Dialog>
            <LobbyControls />
        </>
    )
})
