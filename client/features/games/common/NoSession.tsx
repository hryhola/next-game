import { Button, Dialog } from '@mui/material'
import { useLobby, useWS } from 'client/context/list'
import { GameCtxValue } from './GameFactory'

type Props = {
    game: GameCtxValue
}

export const NoSession: React.FC<Props> = ({ game }) => {
    const ws = useWS()
    const { lobbyId, myRole } = useLobby()

    return (
        <Dialog open={!game.isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
            {myRole === 'player' ? <Button onClick={() => ws.send('Game-Start', { lobbyId })}>Start game</Button> : 'No game in progress'}
        </Dialog>
    )
}
