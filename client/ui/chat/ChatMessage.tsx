import styles from './Chat.module.scss'

interface Props {
    message: ChatMessage
}

export const ChatMessageComponent: React.FC<Props> = ({ message }) => (
    <div className={styles.message}>
        <b>{message.username}</b>&nbsp;{message.text}
    </div>
)
