import { useState, useEffect, useContext, FormEventHandler } from 'react'
import { Failure, Success } from 'uws/api/Auth-Login'
import { AuthContext } from 'client/context/list/auth.context'
import { RouterContext } from 'client/context/list/router.context'
import { WSContext } from 'client/context/list/ws.context'
import { Button, Grid, TextField } from '@mui/material'

export const Login: React.FC = () => {
    const ws = useContext(WSContext)
    const auth = useContext(AuthContext)
    const router = useContext(RouterContext)

    const [username, setUsername] = useState('')
    const [error, setError] = useState('')

    const handleLogin = (data: Success | Failure) => {
        if (data.success) {
            auth.setUsername(data.username)
            router.setCurrentRoute('Home')
        } else {
            setError(data.message)
        }
    }

    useEffect(() => {
        ws.on('Auth-Login', handleLogin)
    }, [])

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()
        setError('')
        ws.send('Auth-Login', { username })
    }

    return (
        <Grid container component="form" onSubmit={handleSubmit} direction="column" justifyContent="center" alignItems="center" spacing={2} height="100vh">
            <Grid item minWidth="300px">
                <TextField
                    id="outlined-basic"
                    name="username"
                    label="Nickname"
                    variant="outlined"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    error={Boolean(error)}
                    helperText={error || undefined}
                    fullWidth
                />
            </Grid>
            <Grid item minWidth="300px">
                <Button type="submit" variant="outlined" size="large" fullWidth>
                    enter
                </Button>
            </Grid>
        </Grid>
    )
}
