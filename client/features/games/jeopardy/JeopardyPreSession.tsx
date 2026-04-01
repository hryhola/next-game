import { LoadingOverlay } from 'client/ui'
import React from 'react'
import { NoSession } from '../common/NoSession'
import { useJeopardy } from './JeopardyView'
import { useI18n } from 'client/context/list'

type Props = {
    isPackLoading: boolean
}

const JeopardyPreSession = (props: Props) => {
    const game = useJeopardy()
    const { t } = useI18n()

    if (game.session?.isPaused) {
        return <LoadingOverlay isLoading={true} text={t('jeopardy.pause')} zIndex="auto" hideProgress />
    }

    return (
        <>
            {props.isPackLoading ? (
                <LoadingOverlay isLoading={props.isPackLoading} text={t('jeopardy.packLoading')} zIndex="auto" />
            ) : (
                <NoSession game={game} starter="master" />
            )}
        </>
    )
}

export default JeopardyPreSession
