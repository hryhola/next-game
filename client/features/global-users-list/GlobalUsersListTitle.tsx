import { useWS, useWSHandler } from 'client/context/list'
import React, { useEffect, useState } from 'react'
import { WSEvents } from 'uWebSockets/globalSocketEvents'
import { RequestHandler } from 'uWebSockets/uws.types'

export const GlobalUsersListTitle: React.FC = () => {
    const ws = useWS()

    const [count, setCount] = useState<number | null>(null)

    const handleCountGot: RequestHandler<'Users-GetCount'> = data => {
        if ('count' in data) {
            setCount(data.count)
        } else {
            console.error(data)
        }
    }

    const handleOnlineUpdate = (data: WSEvents['UserRegistry-OnlineUpdate']) => {
        setCount(data.list.length)
    }

    const onIsConnected = () => {
        ws.send('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'UserRegistry-OnlineUpdate'
        })

        ws.send('Users-GetCount', {
            scope: 'global'
        })
    }

    useWSHandler('Users-GetCount', handleCountGot)
    useWSHandler('UserRegistry-OnlineUpdate', handleOnlineUpdate)

    useEffect(() => {
        ws.isConnected && onIsConnected()

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

    return (
        <>
            Online
            {typeof count === 'number' && <>&nbsp;({count})</>}
        </>
    )
}
