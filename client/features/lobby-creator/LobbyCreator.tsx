import { UserContext } from 'client/context/list/user'
import { JeopardyContext } from 'client/context/list/jeopardy'
import { RouterContext } from 'client/context/list/router'
import { WSContext } from 'client/context/list/ws'
import { FormEventHandler, useContext, useEffect, useState, useRef } from 'react'
import { Request } from 'uWebSockets/ws/Lobby-Create'
import { TextField, Button, Box, FormControl, InputLabel, MenuItem, Select, Input, CircularProgress, Backdrop, Alert } from '@mui/material'
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
            <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" ref={formRef}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField required label="Lobby name" name="lobbyId" value={name} onChange={e => setName(e.target.value)} />
                <FormControl>
                    <InputLabel id="game-type-selector">Game</InputLabel>
                    <Select labelId="game-type-selector" id="game-type-selector" label="Game" value="Jeopardy">
                        <MenuItem value="Jeopardy">Jeopardy</MenuItem>
                    </Select>
                </FormControl>

                <FormControl>
                    <FileUploadIcon />
                    <input required multiple={false} accept=".siq" name="pack" type="file" />
                </FormControl>

                <TextField label="Password" name="password" value={password} onChange={e => setPassword(e.target.value.split('\\').pop()!)} />
                <Button color="primary" variant="contained" type="submit">
                    Create
                </Button>
            </Box>
            <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={isLoading}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </>
    )
}
