import { useWS } from 'client/context/list'
import { UsersListBox } from 'client/ui'
import React, { useEffect, useState } from 'react'
import { WSEvents } from 'uWebSockets/globalSocketEvents'
import { RequestHandler } from 'uWebSockets/uws.types'

export const GlobalUsersList: React.FC = () => {
    const ws = useWS()

    const [users, setUsers] = useState<{ nickname: string }[]>([])

    const handleUsersGot: RequestHandler<'Users-Get'> = data => {
        if ('data' in data) {
            setUsers(data.data)
        } else {
            console.error(data)
        }
    }

    const handleOnlineUpdate = (data: WSEvents['UserRegistry-OnlineUpdate']) => {
        setUsers(data.list)
    }

    const onIsConnected = () => {
        ws.send('Universal-Subscription', {
            mode: 'subscribe',
            topic: 'UserRegistry-OnlineUpdate',
            scope: 'global'
        })
        ws.send('Users-Get', {
            scope: 'global'
        })
    }

    useEffect(() => {
        ws.on('Users-Get', handleUsersGot)
        ws.on('UserRegistry-OnlineUpdate', handleOnlineUpdate)

        return () => {
            ws.send('Universal-Subscription', {
                mode: 'unsubscribe',
                scope: 'global',
                topic: 'UserRegistry-OnlineUpdate'
            })
        }
    }, [])

    useEffect(() => {
        if (ws.isConnected) {
            onIsConnected()
        }
    }, [ws.isConnected])

    return <UsersListBox users={users} />
}
