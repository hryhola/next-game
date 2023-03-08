import { useLobby, useRouter } from 'client/context/list'
import { FormEventHandler, useState } from 'react'
import { TextField, Button, Alert, Grid, Typography, SxProps, Theme } from '@mui/material'
import { LoadingOverlay } from 'client/ui'
import { LobbyData } from 'state'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'

interface Props {
    lobby: LobbyData
    sx?: SxProps<Theme>
}

export const LobbyPreview: React.FC<Props> = props => {
    const router = useRouter()
    const lobby = useLobby()

    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        setIsLoading(true)

        const [response, postError] = await api
            .post(URL.LobbyJoin, {
                lobbyId: props.lobby.id
            })
            .finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        lobby.setGameName(props.lobby.gameName)
        lobby.setLobbyId(props.lobby.id)
        router.setCurrentRoute('Lobby')
    }

    return (
        <>
            <Grid sx={props.sx} container component="form" onSubmit={handleSubmit} direction="column" spacing={2} height="100%">
                {error && (
                    <Grid item>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}
                <Grid container item justifyContent="space-between">
                    <Grid item>{props.lobby.id}</Grid>
                    <Grid item>
                        <Typography color="secondary">
                            {props.lobby.members.length} {props.lobby.members.length === 1 ? 'member' : 'members'}
                        </Typography>
                    </Grid>
                </Grid>
                <Grid container item justifyContent="space-between">
                    <Grid item>
                        <Typography variant="overline">{props.lobby.gameName}</Typography>
                    </Grid>
                    <Grid item>
                        <Typography color="secondary" variant="overline">
                            by&nbsp;{props.lobby.creator.nickname}
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
