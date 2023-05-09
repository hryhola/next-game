import { LoadingOverlay } from 'client/ui'
import React from 'react'
import { NoSession } from '../common/NoSession'
import { useJeopardy } from './JeopardyView'

type Props = {
    isPackLoading: boolean
}

const JeopardyPreSession = (props: Props) => {
    const game = useJeopardy()

    if (game.session?.isPaused) {
        return <LoadingOverlay isLoading={true} text="Pause" zIndex="auto" hideProgress />
    }

    return <>{props.isPackLoading ? <LoadingOverlay isLoading={props.isPackLoading} text="Pack loading" zIndex="auto" /> : <NoSession game={game} />}</>
}

export default JeopardyPreSession
