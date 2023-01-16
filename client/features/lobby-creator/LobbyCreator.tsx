import { UserContext } from 'client/context/list/user'
import { JeopardyContext } from 'client/context/list/jeopardy'
import { RouterContext } from 'client/context/list/router'
import { WSContext } from 'client/context/list/ws'
import { FormEventHandler, useContext, useEffect, useState, useRef } from 'react'
import { Request } from 'uWebSockets/ws/Lobby-Create'
import { TextField, Button, Box, FormControl, InputLabel, MenuItem, Select, Input, CircularProgress, Backdrop, Alert, Grid } from '@mui/material'
import FileUploadIcon from '@mui/icons-material/FileUpload'

export const LobbyCreator: React.FC = () => {
    const router = useContext(RouterContext)
    const user = useContext(UserContext)
    const jeopardy = useContext(JeopardyContext)

    const formRef = useRef<HTMLFormElement | null>(null)

    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit: FormEventHandler<HTMLFormElement> = event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        data.set('creatorId', user.username)

        setIsLoading(true)

        fetch('http://localhost:5555/wsapi/lobby-create/jeopardy', {
            method: 'POST',
            body: data
        })
            .then(res => res.json())
            .then(res => {
                if (!res.success) {
                    setError(res.message)

                    return
                }

                jeopardy.setName(name)
                jeopardy.setMembers([
                    {
                        id: user.username,
                        isCreator: true,
                        isMaster: true
                    }
                ])

                router.setCurrentRoute('Lobby')
            })
            .catch(e => setError(e.toString()))
            .finally(() => setIsLoading(false))
    }

    return (
        <>
            <Grid container component="form" onSubmit={handleSubmit} direction="column" spacing={2} height="100%">
                {error && (
                    <Grid item>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}
                <Grid item>
                    <TextField required label="Lobby name" name="lobbyId" value={name} onChange={e => setName(e.target.value)} fullWidth />
                </Grid>
                <Grid item>
                    <FormControl fullWidth>
                        <InputLabel id="game-type-selector">Game</InputLabel>
                        <Select labelId="game-type-selector" id="game-type-selector" label="Game" value="Jeopardy" fullWidth>
                            <MenuItem value="Jeopardy">Jeopardy</MenuItem>
                            <MenuItem value="tic-tac-toe">Tic Tac Toe</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item>
                    <FormControl>
                        <FileUploadIcon />
                        <input required multiple={false} accept=".siq" name="pack" type="file" />
                    </FormControl>
                </Grid>

                <Grid item>
                    <TextField label="Password" name="password" value={password} onChange={e => setPassword(e.target.value.split('\\').pop()!)} fullWidth />
                </Grid>
                <Grid item sx={{ mt: 'auto', mb: 2 }}>
                    <Button color="primary" variant="contained" type="submit" size="large" fullWidth>
                        Create
                    </Button>
                </Grid>
            </Grid>
            <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={isLoading}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </>
    )
}
