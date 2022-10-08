import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Chat } from 'client/ui'
import { AuthContext } from 'client/context/list/auth.context'
import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws.context'
import { topics } from 'uws/events'
import styles from './GlobalChat.module.scss'
import { IChatMessage } from 'model'

export const GlobalChat: React.FC = () => {
    const auth = useContext(AuthContext)
    const ws = useContext(WSContext)

    const [messages, setMessages] = useState<IChatMessage[]>([])
    const [onlineUsersCount, setOnlineUsersCount] = useState<number | null>(null)

    const handleMessageRetrieve = (data: { message: IChatMessage }) => {
        setMessages(curr => [data.message, ...curr])
    }

    const handlerSend = (text: string) => {
        const message: IChatMessage = {
            username: auth.username,
            text,
            id: uuid()
        }

        ws.send('Global-ChatSend', { message })
    }

    const handleOnlineUpdate = (data: { onlineUsersCount: number }) => {
        setOnlineUsersCount(data.onlineUsersCount)
    }

    const handleMessagesInit = (data: { messages: IChatMessage[] }) => {
        setMessages(data.messages)
    }

    const subscriptionsInit = () => {
        ws.send('Global-Subscribe', {
            topic: topics.globalOnlineUpdate
        })

        ws.send('Global-Subscribe', {
            topic: topics.globalChatMessageUpdate
        })
    }

    useEffect(() => {
        console.log('init global')

        subscriptionsInit()

        ws.on(topics.globalOnlineUpdate, handleOnlineUpdate)
        ws.on(topics.globalChatMessageUpdate, handleMessageRetrieve)
        ws.on(topics['Global-ChatGet'], handleMessagesInit)

        ws.send('Global-OnlineGet')
        ws.send('Global-ChatGet')
    }, [])

    useEffect(() => {
        ws.isConnected && subscriptionsInit()
    }, [ws.isConnected])

    return (
        <div className={styles.container}>
            <div>Online users: {onlineUsersCount}</div>
            <Chat messages={messages} onSendMessage={handlerSend} />
        </div>
    )
}
