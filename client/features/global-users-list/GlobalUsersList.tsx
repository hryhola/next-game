import { useEventHandler, useRequestHandler, useWS } from 'client/context/list'
import { UsersListBox } from 'client/ui'
import React, { useEffect, useState } from 'react'

export const GlobalUsersList: React.FC = () => {
    const ws = useWS()

    const [users, setUsers] = useState<{ nickname: string }[]>([])

    useRequestHandler('Users-Get', data => {
        if ('data' in data) {
            setUsers(data.data)
        } else {
            console.error(data)
        }
    })

    useEventHandler('UserRegistry-OnlineUpdate', data => {
        setUsers(data.list)
    })

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
