import { useContext, useEffect, useState } from 'react'
import { WSContext } from '../../context/ws.context'

import { channel } from '../../../uws/channel'

import styles from './HomeRoute.module.scss'
import { GlobalOnlineUpdate } from '../../../uws/uws.types'
import { SubscribeRequest } from '../../../uws/api/subscribe'

export const HomeRoute: React.FC = () => {
    const ws = useContext(WSContext)
    const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null)

    useEffect(() => {
        ws.on<GlobalOnlineUpdate>('globalOnline', data => {
            setOnlineUsersCount(data.onlineUsersCount)
        })

        ws.send<SubscribeRequest>('subscribe', {
            channel: channel.globalOnline
        })

        ws.send('globalOnline', {})
    }, [])

    return (
        <div className={styles.container}>
            Home route
            <br />
            Online users: {onlineUsersCount}
        </div>
    )
}
