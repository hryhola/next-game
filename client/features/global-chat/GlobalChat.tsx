import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Chat, ChatSXProps } from 'client/ui'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws'
import { TChatMessage } from 'state'
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

        ws.send('GlobalChat-Send', { message })
    }

    const handleGotRecentMessages: RequestHandler<'GlobalChat-Get'> = data => {
        setMessages(data.messages)
    }

    const sendSubscribeRequest = () => {
        ws.send('Global-Subscribe', {
            topic: 'GlobalChat-NewMessage'
        })
    }

    useEffect(() => {
        ws.on('GlobalChat-NewMessage', handleNewMessage)
        ws.on('GlobalChat-Get', handleGotRecentMessages)

        ws.send('GlobalChat-Get')

        return () => {
            ws.send('Global-Unsubscribe', {
                topic: 'GlobalChat-NewMessage'
            })
        }
    }, [])

    useEffect(() => {
        if (ws.isConnected) {
            sendSubscribeRequest()
        }
    }, [ws.isConnected])

    return <Chat messages={messages} onSendMessage={handlerSend} {...props} />
}
