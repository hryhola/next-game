import { FormEventHandler, RefObject, useEffect, useRef, useState } from 'react'
import { ChatMessageComponent } from './ChatMessage'
import type { TChatMessage } from 'shared/contracts/app'
import { Button, Input } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'
import { SendHorizontal } from 'lucide-react'

export type ChatSXProps = {
    className?: string
    messagesClassName?: string
    inputClassName?: string
    inputRef?: RefObject<HTMLInputElement | null>
}

type Props = ChatSXProps & {
    messages: TChatMessage[]
    onSendMessage: (message: string) => void
}

export const chatInputHeight = '56px'

export const ChatBox: React.FunctionComponent<Props> = props => {
    const { className, inputClassName, inputRef, messages, messagesClassName, onSendMessage } = props
    const [text, setText] = useState('')
    const messagesRef = useRef<HTMLDivElement | null>(null)

    const handleMessageSent = () => {
        if (text.trim().length) {
            onSendMessage(text.trim())
            setText('')
        }
    }

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()
        handleMessageSent()
    }

    useEffect(() => {
        if (!messagesRef.current) {
            return
        }

        messagesRef.current.scrollTop = 0
    }, [messages.length])

    return (
        <form className={cn('flex h-full flex-col', className)} onSubmit={handleFormSubmit}>
            <div ref={messagesRef} className={cn('flex flex-1 flex-col-reverse gap-3 overflow-y-auto', messagesClassName)}>
                {messages.map(message => (
                    <ChatMessageComponent key={message.id} message={message} />
                ))}
            </div>
            <div className={cn('mt-3 flex h-[56px] items-center gap-3', inputClassName)}>
                <Input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message..." className="h-full flex-1" />
                <Button
                    type="button"
                    variant="ghost"
                    className="size-12 rounded-full border-0 bg-transparent p-0 text-violet-200 shadow-none hover:bg-white/6"
                    onClick={handleMessageSent}
                >
                    <SendHorizontal className="size-6 text-violet-200" strokeWidth={2.25} />
                </Button>
            </div>
        </form>
    )
}
