import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Chat, ChatSXProps } from 'client/ui'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws'
import { TChatMessage } from 'model'
import { GlobalPublishedEvents } from 'uWebSockets/globalSocketEvents'
import { RequestHandler } from 'uWebSockets/uws.types'

export const GlobalChat: React.FC<ChatSXProps> = props => {
    const user = useContext(UserContext)
    const ws = useContext(WSContext)

    const [messages, setMessages] = useState<TChatMessage[]>([])

    const handleNewMessage = (data: GlobalPublishedEvents['GlobalChat-NewMessage']) => {
        setMessages(curr => [data.message, ...curr])
    }

    const handlerSend = (text: string) => {
        const message: TChatMessage = {
            username: user.username,
            text,
            id: uuid()
        }

        ws.send('Global-ChatSend', { message })
    }

    const handleGotRecentMessages: RequestHandler<'Global-ChatGet'> = data => {
        setMessages(data.messages)
    }

    const subscriptionsInit = () => {
        ws.send('Global-Subscribe', {
            topic: 'GlobalChat-NewMessage'
        })
    }

    useEffect(() => {
        console.log('init global')

        subscriptionsInit()

        ws.on('GlobalChat-NewMessage', handleNewMessage)
        ws.on('Global-ChatGet', handleGotRecentMessages)

        ws.send('Global-ChatGet')
    }, [])

    useEffect(() => {
        ws.isConnected && subscriptionsInit()
    }, [ws.isConnected])

    return <Chat messages={messages} onSendMessage={handlerSend} {...props} />
}
