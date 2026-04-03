import React from 'react'
import { PlayersHeader } from '../common/PlayersHeader'
import type { PlayerHighlightTone } from '../common/Player'
import { useJeopardy, useJeopardyAction } from './JeopardyView'

type TemporaryHighlight = {
    id: number
    playerId: string
    tone: PlayerHighlightTone
}

const highlightDurations: Record<Exclude<PlayerHighlightTone, 'green'>, number> = {
    blue: 900,
    cyan: 500,
    red: 900
}

const JeopardyPlayersHeader = () => {
    const [temporaryHighlights, setTemporaryHighlights] = React.useState<TemporaryHighlight[]>([])
    const nextHighlightIdRef = React.useRef(1)
    const timeoutIdsRef = React.useRef<number[]>([])
    const game = useJeopardy()

    const pushTemporaryHighlight = React.useCallback((playerId: string | null | undefined, tone: Exclude<PlayerHighlightTone, 'green'>) => {
        if (!playerId) {
            return
        }

        const id = nextHighlightIdRef.current++

        setTemporaryHighlights(current => [...current, { id, playerId, tone }])

        const timeoutId = window.setTimeout(() => {
            setTemporaryHighlights(current => current.filter(highlight => highlight.id !== id))
        }, highlightDurations[tone])

        timeoutIdsRef.current.push(timeoutId)
    }, [])

    React.useEffect(() => {
        return () => {
            timeoutIdsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId))
            timeoutIdsRef.current = []
        }
    }, [])

    useJeopardyAction('$AnswerRequest', data => {
        if (data.result.isPlayerOnCooldown) {
            pushTemporaryHighlight(data.actor.id, 'cyan')
        }
    })

    useJeopardyAction('$RateAnswer', data => {
        pushTemporaryHighlight(data.result.answeringPlayerId, data.result.rating === 'approved' ? 'blue' : 'red')
    })

    useJeopardyAction('$RateFinalAnswer', data => {
        pushTemporaryHighlight(data.payload.answeringPlayerId, data.payload.rate === 'approved' ? 'blue' : 'red')
    })

    const persistentHighlights = React.useMemo(() => {
        const toneByPlayerId: Partial<Record<string, PlayerHighlightTone>> = {}

        if (game.session?.frame.id === 'question-board' && game.session.frame.pickerId) {
            toneByPlayerId[game.session.frame.pickerId] = 'cyan'
        }

        if (game.session?.frame.id === 'question-content') {
            if (game.session.frame.selectedPlayerId) {
                toneByPlayerId[game.session.frame.selectedPlayerId] = 'cyan'
            }

            if (game.session.frame.answeringPlayerId && game.session.frame.answeringStatus === 'answering') {
                toneByPlayerId[game.session.frame.answeringPlayerId] = 'green'
            } else if (game.session.frame.answeringPlayerId) {
                toneByPlayerId[game.session.frame.answeringPlayerId] = 'cyan'
            }
        }

        if (game.session?.frame.id === 'final-round-board' && game.session.frame.skipperId) {
            toneByPlayerId[game.session.frame.skipperId] = 'cyan'
        }

        return toneByPlayerId
    }, [game.session])

    const temporaryHighlightMap = React.useMemo(() => {
        const toneByPlayerId: Partial<Record<string, PlayerHighlightTone>> = {}

        for (const highlight of temporaryHighlights) {
            toneByPlayerId[highlight.playerId] = highlight.tone
        }

        return toneByPlayerId
    }, [temporaryHighlights])

    return (
        <PlayersHeader
            members={game.players}
            isLoading={game.isLoading}
            highlightToneByPlayerId={{
                ...persistentHighlights,
                ...temporaryHighlightMap
            }}
            masterLabel="role"
        />
    )
}

export default JeopardyPlayersHeader
