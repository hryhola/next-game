import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Chat, ChatSXProps } from 'client/ui'
import { UserContext } from 'client/context/list/user.context'
import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws.context'
import { topics } from 'uws/events'
import { TChatMessage } from 'model'

export const GlobalChat: React.FC<ChatSXProps> = props => {
    const auth = useContext(UserContext)
    const ws = useContext(WSContext)

    const [messages, setMessages] = useState<TChatMessage[]>([])

    const handleMessageRetrieve = (data: { message: TChatMessage }) => {
        setMessages(curr => [data.message, ...curr])
    }

    const handlerSend = (text: string) => {
        const message: TChatMessage = {
            username: auth.username,
            text,
            id: uuid()
        }

        ws.send('Global-ChatSend', { message })
    }

    const handleMessagesInit = (data: { messages: TChatMessage[] }) => {
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

        ws.on(topics.globalChatMessageUpdate, handleMessageRetrieve)
        ws.on(topics['Global-ChatGet'], handleMessagesInit)

        ws.send('Global-ChatGet')
    }, [])

    useEffect(() => {
        ws.isConnected && subscriptionsInit()
    }, [ws.isConnected])

    return <Chat messages={messages} onSendMessage={handlerSend} {...props} />
}
