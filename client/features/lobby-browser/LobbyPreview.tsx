import { UserContext } from 'client/context/list/user'
import { LobbyContext } from 'client/context/list/lobby'
import { RouterContext } from 'client/context/list/router'
import { WSContext } from 'client/context/list/ws'
import { FormEventHandler, useContext, useEffect, useState, useRef } from 'react'
import { TextField, Button, Box, FormControl, InputLabel, MenuItem, Select, Input, CircularProgress, Backdrop, Alert, Grid, Typography } from '@mui/material'
import { LoadingOverlay } from 'client/ui'
import { TLobbyPublicData } from 'state'

interface Props {
    lobby: TLobbyPublicData
}

export const LobbyPreview: React.FC<Props> = props => {
    const router = useContext(RouterContext)
    const user = useContext(UserContext)
    const lobby = useContext(LobbyContext)

    const formRef = useRef<HTMLFormElement | null>(null)

    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        router.setCurrentRoute('Lobby')
    }

    return (
        <>
            <Grid container component="form" onSubmit={handleSubmit} ref={formRef} direction="column" spacing={2} height="100%">
                {error && (
                    <Grid item>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}
                <Grid container item justifyContent="space-between">
                    <Grid item>
                        <Typography variant="h4">{props.lobby.id}</Typography>
                    </Grid>
                    <Grid item>
                        <Typography color="secondary" variant="h4">
                            {props.lobby.membersCount}
                        </Typography>
                    </Grid>
                </Grid>
                <Grid container item justifyContent="space-between">
                    <Grid item>
                        <Typography variant="overline">{props.lobby.gameName}</Typography>
                    </Grid>
                    <Grid item>
                        <Typography color="secondary" variant="overline">
                            by&nbsp;{props.lobby.creatorID}
                        </Typography>
                    </Grid>
                </Grid>

                {props.lobby.private && (
                    <Grid item>
                        <TextField
                            label="Password"
                            name="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value.split('\\').pop()!)}
                            fullWidth
                        />
                    </Grid>
                )}

                <Grid item sx={{ mt: 'auto' }}>
                    <Button color="primary" variant="contained" type="submit" size="large" fullWidth>
                        Join
                    </Button>
                </Grid>
            </Grid>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
