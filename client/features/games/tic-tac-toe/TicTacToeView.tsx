import React from 'react'
import { TicTacToeCanvas } from './TicTacToeCanvas'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { PlayersHeader } from '../common/PlayersHeader'
import { createGame } from '../common/GameFactory'
import { NoSession } from '../common/NoSession'
import type { TicTacToeGameActionMap } from 'shared/contracts/game-actions'
import type { TicTacToeInitialData, TicTacToePlayerData, TicTacToeSessionData } from 'shared/contracts/app'

export const [TicTacToeView, useTicTacToe, useTicTacToeAction, useActionSender] = createGame<
    TicTacToePlayerData,
    TicTacToeSessionData,
    TicTacToeInitialData,
    TicTacToeGameActionMap
>(() => {
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
