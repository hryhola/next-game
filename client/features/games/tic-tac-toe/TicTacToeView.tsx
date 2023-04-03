import React from 'react'
import { TicTacToeCanvas } from './TicTacToeCanvas'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { PlayersHeader } from '../common/PlayersHeader'
import { createGame } from '../common/GameFactory'
import { TicTacToe } from 'state'
import { NoSession } from '../common/NoSession'

export const [TicTacToeView, useTicTacToe, useTicTacToeAction, useActionSender] = createGame<TicTacToe>(() => {
    const game = useTicTacToe()

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <TicTacToeCanvas />
            <NoSession game={game} />
            <LobbyControls />
        </>
    )
})
