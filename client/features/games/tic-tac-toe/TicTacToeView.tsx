import { Button, Dialog } from '@mui/material'
import React from 'react'
import { TicTacToeCanvas } from './TicTacToeCanvas'
import { useLobby, useWS } from 'client/context/list'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import PlayersHeader from '../common/PlayersHeader'
import { createGame } from '../common/GameCtx'
import { TicTacToePlayerData, TicTacToeSession, TicTacToeSessionData } from 'state'

type TicTacToeCtx = {
    players: TicTacToePlayerData[]
    session: TicTacToeSessionData | null
}

export const [TicTacToeView, useTicTacToe, useTicTacToeAction] = createGame<TicTacToeCtx, TicTacToeSession>(({ isSessionStarted, isLoading, players }) => {
    const lobby = useLobby()
    const ws = useWS()

    return (
        <>
            <PlayersHeader members={players} isLoading={isLoading} />
            <TicTacToeCanvas />
            <Dialog open={!isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
                <Button onClick={() => ws.send('Game-Start', { lobbyId: lobby.lobbyId })}>Start game</Button>
            </Dialog>
            <LobbyControls />
        </>
    )
})
