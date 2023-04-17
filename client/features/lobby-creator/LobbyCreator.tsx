import { FormEventHandler, useContext, useState, useRef, useEffect } from 'react'
import { TextField, Button, FormControl, InputLabel, MenuItem, Select, Alert, Grid, SelectChangeEvent } from '@mui/material'
import { useLobby } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import { GameName } from 'state/games'
import { HomeContext } from 'client/context/list/homeCtx'
import { InitialGameDataSchema } from 'state/common/game/GameInitialData'

export const LobbyCreator: React.FC = () => {
    const home = useContext(HomeContext)
    const router = useClientRouter()
    const lobby = useLobby()

    const formRef = useRef<HTMLFormElement | null>(null)

    const [lobbyId, setLobbyId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [gameName, setGameName] = useState<GameName>('Clicker')
    const [isLoading, setIsLoading] = useState(false)
    const [initialDataScheme, setInitialDataScheme] = useState<InitialGameDataSchema>([])

    const updateGameSchema = async (gameName: GameName) => {
        const [response, error] = await api.post('game-get-schema', { gameName })

        if (!response) {
            return setError(String(error))
        }

        if (!response.success) {
            return setError(response.message)
        }

        setInitialDataScheme(response.initialDataScheme || [])
    }

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        const [response, postError] = await api.post('lobby-create', data).finally(() => setIsLoading(false))

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

        router.setFrame('Lobby')
    }

    const handleGameChange = async (event: SelectChangeEvent) => {
        const gameName = event.target.value as GameName

        setGameName(gameName)
    }

    useEffect(() => {
        updateGameSchema(gameName)
    }, [gameName])

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
                            onChange={handleGameChange}
                            labelId="game-type-selector"
                            id="game-type-selector"
                            name="gameName"
                            label="Game"
                            fullWidth
                        >
                            <MenuItem value="Clicker">Clicker</MenuItem>
                            <MenuItem value="Jeopardy">Jeopardy</MenuItem>
                            <MenuItem value="TicTacToe">Tic Tac Toe</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                {initialDataScheme.map(field => (
                    <Grid item key={field.name}>
                        {field.type === 'field' && <TextField label={field.label} name={'initialData-' + field.name} required={field.required} fullWidth />}
                        {field.type === 'file' && (
                            <FormControl sx={{ display: 'inline-block' }}>
                                <label>{field.label}&nbsp;</label>
                                <input
                                    required={field.required}
                                    multiple={false}
                                    accept={field.accept.join(',')}
                                    name={'initialData-' + field.name}
                                    type="file"
                                />
                            </FormControl>
                        )}
                    </Grid>
                ))}

                <Grid item>
                    <TextField label="Password" name="password" value={password} onChange={e => setPassword(e.target.value.split('\\').pop()!)} fullWidth />
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
