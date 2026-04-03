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
    const isPaused = Boolean(game.session?.isPaused)
    const [pauseOverlayPhase, setPauseOverlayPhase] = React.useState<'entering' | 'hidden' | 'leaving' | 'visible'>(isPaused ? 'visible' : 'hidden')

    React.useEffect(() => {
        if (isPaused) {
            setPauseOverlayPhase(current => (current === 'visible' ? current : 'entering'))

            const timeoutId = window.setTimeout(() => {
                setPauseOverlayPhase('visible')
            }, 220)

            return () => {
                window.clearTimeout(timeoutId)
            }
        }

        setPauseOverlayPhase(current => (current === 'hidden' ? current : 'leaving'))

        const timeoutId = window.setTimeout(() => {
            setPauseOverlayPhase('hidden')
        }, 220)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [isPaused])

    if (pauseOverlayPhase !== 'hidden') {
        return (
            <div
                className={`pointer-events-none fixed inset-0 flex items-center justify-center ${
                    pauseOverlayPhase === 'leaving'
                        ? 'jeopardy-pause-glow-leave'
                        : pauseOverlayPhase === 'entering'
                          ? 'jeopardy-pause-glow-enter'
                          : 'jeopardy-pause-glow-visible'
                }`}
                style={{ zIndex: 35 }}
                aria-hidden={!isPaused}
                aria-label={isPaused ? t('jeopardy.pause') : undefined}
                data-testid="jeopardy-pause-overlay"
                role={isPaused ? 'status' : undefined}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                            radial-gradient(ellipse at top, rgba(148, 163, 184, 0.18), transparent 58%),
                            radial-gradient(ellipse at bottom, rgba(148, 163, 184, 0.16), transparent 58%),
                            radial-gradient(ellipse at left, rgba(148, 163, 184, 0.14), transparent 54%),
                            radial-gradient(ellipse at right, rgba(148, 163, 184, 0.14), transparent 54%)
                        `,
                        boxShadow: 'inset 0 0 120px rgba(148, 163, 184, 0.18), inset 0 0 220px rgba(15, 23, 42, 0.18)'
                    }}
                />
            </div>
        )
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
