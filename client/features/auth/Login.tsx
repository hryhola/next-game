import { useState, useEffect, useContext, FormEventHandler } from 'react'
import { LoginFailure, LoginSuccess } from 'uws/api/Auth-Login'
import { AuthContext } from 'client/context/list/auth.context'
import { RouterContext } from 'client/context/list/router.context'
import { WSContext } from 'client/context/list/ws.context'

export const Login: React.FC = () => {
    const ws = useContext(WSContext)
    const auth = useContext(AuthContext)
    const router = useContext(RouterContext)

    const [username, setUsername] = useState('')
    const [error, setError] = useState('')

    const handleLogin = (data: LoginSuccess | LoginFailure) => {
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
        <form onSubmit={handleSubmit}>
            {error && <div>{error}</div>}
            <input type="text" name="username" value={username} onChange={e => setUsername(e.target.value)} />
            <button type="submit">login</button>
        </form>
    )
}
