import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/auth.context'
import { RouterContext } from '../../context/router.context'
import { WSContext } from '../../context/ws.context'

export const Login: React.FC = () => {
    const ws = useContext(WSContext)
    const auth = useContext(AuthContext)
    const router = useContext(RouterContext)

    const [username, setUsername] = useState('')

    useEffect(() => {
        ws.on<{ success: boolean; username: string }>('login', data => {
            console.log(data)

            if (data.success) {
                auth.setUsername(data.username)
                router.setCurrentRoute('Home')
            }
        })
    }, [])

    return (
        <div>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
            <button onClick={() => ws.send('login', { username })}>login</button>
        </div>
    )
}
