import { useLobby, useRouter } from 'client/context/list'
import { FormEventHandler, useContext, useState, useRef } from 'react'
import { TextField, Button, FormControl, InputLabel, MenuItem, Select, Alert, Grid } from '@mui/material'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import { URL as ApiUrl } from 'client/network-utils/const'
import { GeneralFailure, GeneralSuccess } from 'util/t'
import { GameName } from 'state/games'
import { HomeContext } from 'client/context/list/home'

export const LobbyCreator: React.FC = () => {
    const home = useContext(HomeContext)
    const router = useRouter()
    const lobby = useLobby()

    const formRef = useRef<HTMLFormElement | null>(null)

    const [lobbyId, setLobbyId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [gameName, setGameName] = useState<GameName>('Clicker')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        const [response, postError] = await api.post<GeneralSuccess | GeneralFailure>(ApiUrl.Lobby, data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        lobby.setLobbyId(lobbyId)
        lobby.setGameName(gameName)

        home.setIsCreateLobbyOpen(false)

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
                <Grid item>
                    <TextField required label="Lobby name" name="lobbyId" value={lobbyId} onChange={e => setLobbyId(e.target.value)} fullWidth />
                </Grid>
                <Grid item>
                    <FormControl fullWidth>
                        <InputLabel required id="game-type-selector">
                            Game
                        </InputLabel>
                        <Select
                            value={gameName}
                            onChange={e => setGameName(e.target.value as GameName)}
                            labelId="game-type-selector"
                            id="game-type-selector"
                            name="gameName"
                            label="Game"
                            fullWidth
                        >
                            {/* <MenuItem value="jeopardy">Jeopardy</MenuItem> */}
                            {/* <MenuItem value="TicTacToe">Tic Tac Toe</MenuItem> */}
                            <MenuItem value="Clicker">Clicker</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                {/* <Grid item>
                    <FormControl>
                        <FileUploadIcon />
                        <input required multiple={false} accept=".siq" name="pack" type="file" />
                    </FormControl>
                </Grid> */}

                <Grid item>
                    <TextField
                        sx={{ visibility: 'hidden' }}
                        label="Password"
                        name="password"
                        value={password}
                        onChange={e => setPassword(e.target.value.split('\\').pop()!)}
                        fullWidth
                    />
                </Grid>
                <Grid item sx={{ mt: 'auto', mb: 2 }}>
                    <Button color="primary" variant="contained" type="submit" size="large" fullWidth>
                        Create
                    </Button>
                </Grid>
            </Grid>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
