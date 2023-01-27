import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { ChatBox, ChatSXProps } from 'client/ui'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws'
import { TChatMessage } from 'state'
import { GlobalPublishedEvents } from 'uWebSockets/globalSocketEvents'
import { RequestData, RequestHandler } from 'uWebSockets/uws.types'

type Props = ChatSXProps & {
    scope: 'global' | 'lobby'
    lobbyId?: string
}

function isCurrentChatMessage(data: { scope?: string; lobbyId?: string }, scope: string, lobbyId?: string) {
    if (scope === 'global') {
        return data.scope === 'global'
    } else {
        return data.scope === scope && data.lobbyId === lobbyId
    }
}

export const Chat: React.FC<Props> = props => {
    const user = useContext(UserContext)
    const ws = useContext(WSContext)

    const [messages, setMessages] = useState<TChatMessage[]>([])

    const handleNewMessage = (data: GlobalPublishedEvents['Chat-NewMessage']) => {
        if (isCurrentChatMessage(data, props.scope, props.lobbyId)) {
            setMessages(curr => [data.message, ...curr])
        }
    }

    const handlerSend = (text: string) => {
        const message: TChatMessage = {
            nickname: user.nickname,
            nicknameColor: user.nicknameColor,
            text,
            id: uuid()
        }

        const data: RequestData<'Chat-Send'> =
            props.scope === 'lobby'
                ? {
                      message,
                      scope: props.scope,
                      lobbyId: props.lobbyId!
                  }
                : {
                      message,
                      scope: props.scope
                  }

        ws.send('Chat-Send', data)
    }

    const handleGotRecentMessages: RequestHandler<'Chat-Get'> = data => {
        if (data.success && isCurrentChatMessage(data, props.scope, props.lobbyId)) {
            setMessages(data.messages)
        } else {
            console.error(data)
        }
    }

    // TODO For lobby chat
    const sendSubscribeRequestForGlobalScope = () => {
        ws.send('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'Chat-NewMessage'
        })
    }

    useEffect(() => {
        ws.on('Chat-NewMessage', handleNewMessage)

        ws.on('Chat-Get', handleGotRecentMessages)

        ws.send('Chat-Get', {
            lobbyId: props.lobbyId!,
            scope: props.scope
        })

        return () => {
            // TODO For lobby chat
            if (props.scope === 'global') {
                ws.send('Universal-Subscription', {
                    mode: 'unsubscribe',
                    scope: 'global',
                    topic: 'Chat-NewMessage'
                })
            }
        }
    }, [])

    useEffect(() => {
        if (ws.isConnected && props.scope === 'global') {
            sendSubscribeRequestForGlobalScope()
        }
    }, [ws.isConnected])

    return <ChatBox messages={messages} onSendMessage={handlerSend} {...props} />
}
