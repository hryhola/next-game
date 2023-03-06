import { Grid, Button } from '@mui/material'
import { useLobby, useWS } from 'client/context/list'

export const ClickerStartMenu = () => {
    const ws = useWS()
    const { lobbyId } = useLobby()

    return (
        <Grid container justifyContent="center" alignItems="center" height="var(--fullHeight)">
            <Grid item>
                <Button onClick={() => ws.send('Game-Start', { lobbyId })}>Start</Button>
            </Grid>
        </Grid>
    )
}
