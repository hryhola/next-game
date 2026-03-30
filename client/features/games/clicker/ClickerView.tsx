import React from 'react'
import { PlayersHeader } from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { ClickerCanvas } from './ClickerCanvas'
import { createGame } from '../common/GameFactory'
import { NoSession } from '../common/NoSession'
import type { ClickerGameActionMap } from 'shared/contracts/game-actions'
import type { ClickerInitialData, ClickerPlayerData, ClickerSessionData } from 'shared/contracts/app'

export const [ClickerView, useClicker, useClickerAction, useActionSender] = createGame<
    ClickerPlayerData,
    ClickerSessionData,
    ClickerInitialData,
    ClickerGameActionMap
>(() => {
    const game = useClicker()

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <ClickerCanvas />
            <NoSession game={game} />
            <LobbyControls />
        </>
    )
})
