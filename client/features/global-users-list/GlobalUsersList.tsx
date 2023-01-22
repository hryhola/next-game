import { WSContext } from 'client/context/list/ws'
import { UsersList } from 'client/ui'
import React, { useContext, useEffect, useState } from 'react'
import { RequestHandler } from 'uWebSockets/uws.types'

type Props = {}

export const GlobalUsersList: React.FC<Props> = props => {
    const ws = useContext(WSContext)

    const [users, setUsers] = useState<{ nickname: string }[]>([])

    const handleUsersGot: RequestHandler<'GlobalOnline-GetUsers'> = data => {
        setUsers(data.users)
    }

    const sendSubscribeRequest = () => {
        ws.send('Global-Subscribe', {
            topic: 'GlobalOnline-UsersUpdate'
        })
    }

    useEffect(() => {
        ws.on('GlobalOnline-GetUsers', handleUsersGot)
        ws.on('GlobalOnline-UsersUpdate', handleUsersGot)

        ws.send('GlobalOnline-GetUsers')

        return () => {
            ws.send('Global-Unsubscribe', {
                topic: 'GlobalOnline-UsersUpdate'
            })
        }
    }, [])

    useEffect(() => {
        if (ws.isConnected) {
            sendSubscribeRequest()
        }
    }, [ws.isConnected])

    return <UsersList users={users} />
}
