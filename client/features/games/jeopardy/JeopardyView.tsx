import { useState } from 'react'
import { createGame } from '../common/GameFactory'
import { JeopardyCanvas } from './JeopardyCanvas'

import JeopardyControls from './JeopardyControls'
import JeopardyPlayersHeader from './JeopardyPlayersHeader'
import JeopardyPreSession from './JeopardyPreSession'
import JeopardySounds from './JeopardySounds'
import type { JeopardyGameActionMap } from 'shared/contracts/game-actions'
import type { JeopardyInitialData, JeopardyPlayerData, JeopardySessionData } from 'shared/contracts/app'

export const [JeopardyView, useJeopardy, useJeopardyAction, useActionSender] = createGame<
    JeopardyPlayerData,
    JeopardySessionData,
    JeopardyInitialData,
    JeopardyGameActionMap
>(() => {
    const [isPackLoading, setIsPackLoading] = useState(true)

    return (
        <>
            <JeopardyPlayersHeader />
            <JeopardyCanvas isPackLoading={isPackLoading} setIsPackLoading={setIsPackLoading} />
            <JeopardyPreSession isPackLoading={isPackLoading} />
            <JeopardySounds />
            <JeopardyControls />
        </>
    )
})
