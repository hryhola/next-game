import { WSContext } from 'client/context/list/ws'
import React, { useContext, useEffect, useState } from 'react'
import { RequestHandler } from 'uWebSockets/uws.types'

export const GlobalUsersListTitle: React.FC = () => {
    const ws = useContext(WSContext)

    const [count, setCount] = useState<number | null>(null)

    const handleCountGot: RequestHandler<'Users-GetCount'> = data => {
        if ('count' in data) {
            setCount(data.count)
        } else {
            console.error(data)
        }
    }

    const sendSubscribeRequest = () => {
        ws.send('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'Universal-UsersCountUpdate'
        })
    }

    useEffect(() => {
        ws.on('Users-GetCount', handleCountGot)
        ws.on('Universal-UsersCountUpdate', handleCountGot)

        ws.send('Users-GetCount', {
            scope: 'global'
        })

        return () => {
            ws.send('Universal-Subscription', {
                mode: 'unsubscribe',
                scope: 'global',
                topic: 'Universal-UsersCountUpdate'
            })
        }
    }, [])

    useEffect(() => {
        sendSubscribeRequest()
    }, [ws.isConnected])

    return (
        <>
            Online
            {typeof count === 'number' && <>&nbsp;({count})</>}
        </>
    )
}
