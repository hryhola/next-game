import { useLobby, useUser, useWS } from 'client/context/list'
import { GameCtxValue } from './GameFactory'
import { Button } from 'client/ui/primitives'

type Props = {
    game: GameCtxValue
    starter?: 'any' | 'master'
}

export const NoSession: React.FC<Props> = props => {
    const ws = useWS()
    const user = useUser()
    const { lobbyId, myRole } = useLobby()

    const isMasterView = props.game.players.some(p => p.id === user.id && p.playerIsMaster)

    const starter = props.starter || 'any'
    const canStart = myRole === 'player' && (starter === 'any' || isMasterView)

    if (props.game.isSessionStarted) {
        return null
    }

    const supportingText =
        myRole !== 'player'
            ? 'Players can start the session when the lobby is ready. Floating chat and lobby controls stay around the frame.'
            : canStart
              ? 'Start the session when everyone is ready. Ready check, leave, chat, and the rest of the lobby tools stay available around the frame.'
              : 'Waiting for the game master to start the session. Floating chat and lobby controls stay available around the frame.'

    return (
        <div
            className="pointer-events-none fixed left-4 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+148px)] z-10 flex items-center justify-center sm:left-6 sm:right-6 md:bottom-4"
            style={{
                top: 'calc(var(--playersHeaderHeight, 0px) + 16px)'
            }}
        >
            <div className="glass-card pointer-events-auto mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-7 text-center">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-violet-200/60">Session Gate</p>
                    <h2 className="text-2xl font-semibold text-white">No game in progress</h2>
                    <p className="text-sm text-slate-300">{supportingText}</p>
                </div>
                {canStart ? (
                    <Button size="lg" onClick={() => ws.send('Game-Start', { lobbyId })}>
                        Start game
                    </Button>
                ) : null}
            </div>
        </div>
    )
}
