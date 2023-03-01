import { useEventHandler, useRequestHandler, useWS } from 'client/context/list'
import React, { useEffect, useState } from 'react'

export const GlobalUsersListTitle: React.FC = () => {
    const ws = useWS()

    const [count, setCount] = useState<number | null>(null)

    useRequestHandler('Users-GetCount', data => {
        if ('count' in data) {
            setCount(data.count)
        } else {
            console.error(data)
        }
    })

    useEventHandler('UserRegistry-OnlineUpdate', data => {
        setCount(data.list.length)
    })

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
