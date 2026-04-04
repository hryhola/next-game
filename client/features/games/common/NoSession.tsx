import { useClientRequestErrorHandler, useEventHandler, useI18n, useLobby, useUser, useWS } from 'client/context/list'
import { GameCtxValue } from './GameFactory'
import { Button, Spinner } from 'client/ui/primitives'
import { useState } from 'react'

type Props = {
    game: GameCtxValue
    starter?: 'any' | 'master'
}

export const NoSession: React.FC<Props> = props => {
    const ws = useWS()
    const user = useUser()
    const { lobbyId, myRole } = useLobby()
    const { t } = useI18n()
    const [isStarting, setIsStarting] = useState(false)

    const isMasterView = props.game.players.some(p => p.id === user.id && p.playerIsMaster)

    const starter = props.starter || 'any'
    const canStart = myRole === 'player' && (starter === 'any' || isMasterView)

    useEventHandler('Game-SessionStart', data => {
        if (data.lobbyId === lobbyId) {
            setIsStarting(false)
        }
    })

    useClientRequestErrorHandler(error => {
        if (error.context === 'Game-Start') {
            setIsStarting(false)
        }
    })

    if (props.game.isLoading || props.game.isSessionStarted) {
        return null
    }

    const supportingText = myRole !== 'player' ? t('noSession.spectator') : canStart ? t('noSession.canStart') : t('noSession.waiting')

    return (
        <div
            className="pointer-events-none fixed left-4 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+148px)] z-10 flex items-center justify-center sm:left-6 sm:right-6 md:bottom-4"
            style={{
                top: 'calc(var(--playersHeaderHeight, 0px) + 16px)'
            }}
        >
            <div className="glass-card pointer-events-auto mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-7 text-center">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-violet-200/60">{t('noSession.label')}</p>
                    <h2 className="text-2xl font-semibold text-white">{t('noSession.title')}</h2>
                    <p className="text-sm text-slate-300">{supportingText}</p>
                </div>
                {canStart ? (
                    <Button
                        size="lg"
                        disabled={isStarting}
                        onClick={() => {
                            if (isStarting) {
                                return
                            }

                            setIsStarting(true)
                            ws.send('Game-Start', { lobbyId })
                        }}
                    >
                        {isStarting ? (
                            <>
                                <Spinner className="size-4 text-slate-950" />
                                <span>{t('noSession.startingGame')}</span>
                            </>
                        ) : (
                            t('noSession.startGame')
                        )}
                    </Button>
                ) : null}
            </div>
        </div>
    )
}
