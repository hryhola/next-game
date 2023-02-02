import { useState, useEffect, useContext, FormEventHandler, useRef } from 'react'
import { UserContext } from 'client/context/list/user'
import { RouterContext } from 'client/context/list/router'
import { WSContext } from 'client/context/list/ws'
import { Button, Grid, TextField } from '@mui/material'
import { RequestHandler } from 'uWebSockets/uws.types'
import { setCookie } from 'cookies-next'

const inSeconds90Days = 7776000

export const Login: React.FC = () => {
    const ws = useContext(WSContext)
    const user = useContext(UserContext)
    const router = useContext(RouterContext)

    const [nickname, setNickname] = useState('')
    const [error, setError] = useState('')

    const handleRegister: RequestHandler<'Auth-Register'> = data => {
        if (data.success) {
            user.setNickname(data.user.nickname)
            user.setNicknameColor(data.user.nicknameColor)

            setCookie('token', data.token, { maxAge: inSeconds90Days })

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

        const nicknameTrimmed = nickname.trim()

        if (nicknameTrimmed.length) {
            setError('')

            ws.send('Auth-Register', { nickname: nicknameTrimmed })
        } else {
            setError('nickname cannot be empty')
        }
    }

    return (
        <Grid
            container
            component="form"
            onSubmit={handleSubmit}
            direction="column"
            justifyContent="center"
            alignItems="center"
            spacing={2}
            height="var(--fullHeight)"
        >
            <Grid item minWidth="300px">
                <TextField
                    id="outlined-basic"
                    name="nickname"
                    label="nickname"
                    variant="outlined"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
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
