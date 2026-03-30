import { FormEventHandler, RefObject, useState } from 'react'
import { ChatMessageComponent } from './ChatMessage'
import { TChatMessage } from 'state'
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

    return (
        <form className={cn('flex h-full flex-col', className)} onSubmit={handleFormSubmit}>
            <div
                className={cn(
                    'flex flex-1 flex-col-reverse gap-3 overflow-y-auto rounded-[1.75rem] border border-white/8 bg-slate-950/25 p-3',
                    messagesClassName
                )}
            >
                {messages.map(message => (
                    <ChatMessageComponent key={message.id} message={message} />
                ))}
            </div>
            <div className={cn('mt-3 flex h-[56px] items-center gap-3', inputClassName)}>
                <Input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message..." className="h-full flex-1" />
                <Button type="button" size="icon" variant="secondary" onClick={handleMessageSent}>
                    <SendHorizontal className="size-4" />
                </Button>
            </div>
        </form>
    )
}
