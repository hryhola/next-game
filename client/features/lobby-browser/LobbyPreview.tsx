import { UserContext } from 'client/context/list/user'
import { LobbyContext } from 'client/context/list/lobby'
import { RouterContext } from 'client/context/list/router'
import { WSContext } from 'client/context/list/ws'
import { FormEventHandler, useContext, useEffect, useState, useRef } from 'react'
import {
    TextField,
    Button,
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Input,
    CircularProgress,
    Backdrop,
    Alert,
    Grid,
    Typography,
    ListItemText,
    SxProps,
    Theme
} from '@mui/material'
import { LoadingOverlay } from 'client/ui'
import { TLobbyPublicData } from 'state'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'

interface Props {
    lobby: TLobbyPublicData
    sx?: SxProps<Theme>
}

export const LobbyPreview: React.FC<Props> = props => {
    const router = useContext(RouterContext)
    const user = useContext(UserContext)
    const lobby = useContext(LobbyContext)

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
                            {props.lobby.membersCount} {props.lobby.membersCount === 1 ? 'member' : 'members'}
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
