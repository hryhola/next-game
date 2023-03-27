import React from 'react'
import PlayersHeader from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { ClickerCanvas } from './ClickerCanvas'
import { createGame } from '../common/GameFactory'
import { Clicker } from 'state'
import { ClickerNoSession } from './ClickerNoSession'

export const [ClickerView, useClicker, useClickerAction, useActionSender] = createGame<Clicker>(() => {
    const game = useClicker()

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <ClickerCanvas />
            <ClickerNoSession />
            <LobbyControls />
        </>
    )
})
