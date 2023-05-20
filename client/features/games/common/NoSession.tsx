import { Button, Dialog } from '@mui/material'
import { useLobby, useUser, useWS } from 'client/context/list'
import { GameCtxValue } from './GameFactory'

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

    return (
        <Dialog open={!props.game.isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
            {myRole === 'player' && (starter === 'any' || isMasterView) ? (
                <Button onClick={() => ws.send('Game-Start', { lobbyId })}>Start game</Button>
            ) : (
                'No game in progress'
            )}
        </Dialog>
    )
}
