import React, { useState } from 'react'
import { PlayersHeader } from '../common/PlayersHeader'
import { useJeopardy, useJeopardyAction } from './JeopardyView'

type Props = {}

const JeopardyPlayersHeader = (props: Props) => {
    const [temporaryHighlightedPlayerIds, setTemporaryHighlightedPlayerIds] = useState<string[]>([])

    const game = useJeopardy()

    useJeopardyAction('$AnswerRequest', data => {
        if (data.result.isPlayerOnCooldown) {
            setTemporaryHighlightedPlayerIds(values => [...values, data.actor.id])
            setTimeout(() => setTemporaryHighlightedPlayerIds(value => [...value.filter(v => v !== data.actor.id)]), 500)
        }
    })

    const highlightedPlayedIds: string[] = []

    if (game.session?.frame.id === 'question-board' && game.session.frame.pickerId) {
        highlightedPlayedIds.push(game.session.frame.pickerId)
    }

    if (game.session?.frame.id === 'question-content' && game.session.frame.answeringPlayerId) {
        highlightedPlayedIds.push(game.session.frame.answeringPlayerId)
    }

    if (game.session?.frame.id === 'final-round-board' && game.session.frame.skipperId) {
        highlightedPlayedIds.push(game.session.frame.skipperId)
    }

    return (
        <PlayersHeader
            members={game.players}
            isLoading={game.isLoading}
            highlightedPlayedIds={[...highlightedPlayedIds, ...temporaryHighlightedPlayerIds]}
            masterLabel="role"
        />
    )
}

export default JeopardyPlayersHeader
