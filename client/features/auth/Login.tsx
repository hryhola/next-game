import { useState, useEffect, useContext, FormEventHandler } from 'react'
import { LoginFailure, LoginSuccess } from '../../../uws/api/login'
import { AuthContext } from '../../context/auth.context'
import { RouterContext } from '../../context/router.context'
import { WSContext } from '../../context/ws.context'

export const Login: React.FC = () => {
    const ws = useContext(WSContext)
    const auth = useContext(AuthContext)
    const router = useContext(RouterContext)

    const [username, setUsername] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        ws.on<LoginSuccess | LoginFailure>('login', data => {
            if (data.success) {
                auth.setUsername(data.username)
                router.setCurrentRoute('Home')
            } else {
                setError(data.message)
            }
        })
    }, [])

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()
        setError('')
        ws.send('login', { username })
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div>{error}</div>}
            <input type="text" name="username" value={username} onChange={e => setUsername(e.target.value)} />
            <button type="submit">login</button>
        </form>
    )
}
