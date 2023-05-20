import { useState } from 'react'
import { Jeopardy } from 'state/games/jeopardy/Jeopardy'
import { createGame } from '../common/GameFactory'
import { JeopardyCanvas } from './JeopardyCanvas'

import JeopardyControls from './JeopardyControls'
import JeopardyPlayersHeader from './JeopardyPlayersHeader'
import JeopardyPreSession from './JeopardyPreSession'
import JeopardySounds from './JeopardySounds'

export const [JeopardyView, useJeopardy, useJeopardyAction, useActionSender] = createGame<Jeopardy>(() => {
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
