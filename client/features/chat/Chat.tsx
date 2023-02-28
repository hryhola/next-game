import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { ChatBox, ChatSXProps } from 'client/ui'
import { useWS, useUser, useWSHandler } from 'client/context/list'
import { TChatMessage } from 'state'
import { WSEvents } from 'uWebSockets/globalSocketEvents'
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
    const user = useUser()
    const ws = useWS()

    const [messages, setMessages] = useState<TChatMessage[]>([])

    const handleNewMessage = (data: WSEvents['Chat-NewMessage']) => {
        if (isCurrentChatMessage(data, props.scope, props.lobbyId)) {
            setMessages(curr => [data.message, ...curr])
        }
    }

    const handlerSend = (text: string) => {
        const message: TChatMessage = {
            from: user.nickname,
            fromColor: user.nicknameColor,
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

    useWSHandler('Chat-NewMessage', handleNewMessage)
    useWSHandler('Chat-Get', handleGotRecentMessages)

    useEffect(() => {
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
