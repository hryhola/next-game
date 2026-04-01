import { useEventHandler, useRequestHandler, useWS } from 'client/context/list'
import { useEffect, useState } from 'react'

export type GlobalOnlineUser = {
    id: string
    userNickname: string
}

export const useGlobalOnlineUsers = () => {
    const ws = useWS()
    const [users, setUsers] = useState<GlobalOnlineUser[]>([])
    const [isHydrated, setIsHydrated] = useState(false)

    useRequestHandler('Users-Get', data => {
        if ('data' in data) {
            setUsers(data.data.map(user => ({ id: user.id, userNickname: user.userNickname })))
            setIsHydrated(true)
        } else {
            console.error(data)
        }
    })

    useEventHandler('UserRegistry-OnlineUpdate', data => {
        setUsers(data.list)
        setIsHydrated(true)
    })

    useEffect(() => {
        if (!ws.isConnected) {
            return
        }

        ws.send('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'UserRegistry-OnlineUpdate'
        })

        ws.send('Users-Get', {
            scope: 'global'
        })
    }, [ws.isConnected])

    useEffect(() => {
        return () => {
            ws.send('Universal-Subscription', {
                mode: 'unsubscribe',
                scope: 'global',
                topic: 'UserRegistry-OnlineUpdate'
            })
        }
    }, [])

    return {
        count: isHydrated ? users.length : null,
        users
    }
}
