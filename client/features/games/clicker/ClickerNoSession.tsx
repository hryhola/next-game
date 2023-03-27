import { Box, Button, Dialog } from '@mui/material'
import { useLobby, useWS } from 'client/context/list'
import { useClicker } from './ClickerView'

export const ClickerNoSession = () => {
    const ws = useWS()
    const { lobbyId, myRole } = useLobby()
    const game = useClicker()

    return (
        <Dialog open={!game.isSessionStarted} sx={{ zIndex: 1 }} disableEnforceFocus>
            {myRole === 'player' ? <Button onClick={() => ws.send('Game-Start', { lobbyId })}>Start game</Button> : <Box>Game is not started</Box>}
        </Dialog>
    )
}
