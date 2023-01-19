import { useState, useEffect, useContext, FormEventHandler, useRef } from 'react'
import { UserContext } from 'client/context/list/user'
import { RouterContext } from 'client/context/list/router'
import { WSContext } from 'client/context/list/ws'
import { Button, Grid, TextField } from '@mui/material'
import { RequestHandler } from 'uWebSockets/uws.types'

export const Login: React.FC = () => {
    const ws = useContext(WSContext)
    const user = useContext(UserContext)
    const router = useContext(RouterContext)

    const [username, setUsername] = useState('')
    const [error, setError] = useState('')

    const handleRegister: RequestHandler<'Auth-Register'> = data => {
        if (data.success) {
            user.setUsername(data.username)

            localStorage.setItem('token', data.token)

            router.setCurrentRoute('Home')
        } else {
            setError(data.message)
        }
    }

    useEffect(() => {
        ws.on('Auth-Register', handleRegister)
    }, [])

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()

        setError('')

        ws.send('Auth-Register', { username })
    }

    return (
        <Grid container component="form" onSubmit={handleSubmit} direction="column" justifyContent="center" alignItems="center" spacing={2} height="100vh">
            <Grid item minWidth="300px">
                <TextField
                    id="outlined-basic"
                    name="username"
                    label="nickname"
                    variant="outlined"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    error={Boolean(error)}
                    helperText={error || undefined}
                    fullWidth
                />
            </Grid>
            <Grid item minWidth="300px">
                <Button sx={{ height: '54px' }} type="submit" variant="outlined" fullWidth>
                    enter
                </Button>
            </Grid>
        </Grid>
    )
}
