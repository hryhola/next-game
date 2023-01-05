import { UserContext } from 'client/context/list/user.context'
import { LobbyContext } from 'client/context/list/lobby.context'
import { RouterContext } from 'client/context/list/router.context'
import { WSContext } from 'client/context/list/ws.context'
import { FormEventHandler, useContext, useEffect, useState } from 'react'
import { CreateLobbyRequest } from 'uws/api/Lobby-Create'
import styles from './LobbyCreator.module.scss'

export const LobbyCreator: React.FC = () => {
    const router = useContext(RouterContext)
    const ws = useContext(WSContext)
    const auth = useContext(UserContext)
    const lobby = useContext(LobbyContext)

    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit: FormEventHandler<HTMLFormElement> = event => {
        event.preventDefault()

        const requestData: CreateLobbyRequest = {
            creatorId: auth.username,
            lobbyId: name
        }

        if (password) {
            requestData.password = password
        }

        ws.send('Lobby-Create', requestData)
    }

    useEffect(() => {
        ws.on('Lobby-Create', data => {
            if (!data.success) {
                setError(data.message)
            }

            lobby.setName(name)
            lobby.setMembers([
                {
                    id: auth.username,
                    isCreator: true,
                    isMaster: true
                }
            ])

            router.setCurrentRoute('Lobby')
        })
    }, [])

    return (
        <form className={styles.container} onSubmit={handleSubmit}>
            {error && (
                <>
                    <span>{error}</span>
                    <br />
                </>
            )}
            <label htmlFor="lobby">Lobby name</label>
            <input name="lobby" value={name} onChange={e => setName(e.target.value)} />

            <label htmlFor="lobby-password">Password</label>
            <input name="lobby-password" type="password" value={password} onChange={e => setPassword(e.target.value)} />

            <button type-="submit">Create</button>
        </form>
    )
}
