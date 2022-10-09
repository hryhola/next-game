import { FormEventHandler, useState } from 'react'
import { ChatMessageComponent } from './ChatMessage'
import styles from './Chat.module.scss'
import { TChatMessage } from 'model'

interface Props {
    messages: TChatMessage[]
    onSendMessage: (message: string) => void
}

export const Chat: React.FunctionComponent<Props> = props => {
    const [text, setText] = useState('')

    const handleMessageSent: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()
        setText('')
        props.onSendMessage(text)
    }

    return (
        <form className={styles.container} onSubmit={handleMessageSent}>
            <div className={styles.messages}>
                {props.messages.map(message => (
                    <ChatMessageComponent key={message.id} message={message} />
                ))}
            </div>
            <input className={styles.input} value={text} onChange={e => setText(e.target.value)} />
        </form>
    )
}
