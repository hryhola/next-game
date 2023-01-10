import { JeopardyContext } from 'client/context/list/jeopardy'
import { Chat } from 'client/ui'
import { useContext } from 'react'
import styles from './LobbyRoute.module.scss'

export const LobbyRoute: React.FC = () => {
    const lobby = useContext(JeopardyContext)

    const handleMessageSend = (message: string) => {}

    return (
        <div className={styles.container}>
            <div className={styles.main}>
                <main>game</main>
                <section>
                    {lobby.members.map(m => (
                        <div key={m.id}>{m.id}</div>
                    ))}
                </section>
            </div>
            <aside className={styles.aside}>
                <Chat messages={lobby.chatMessages} onSendMessage={handleMessageSend} />
                <button>КНОПКА</button>
            </aside>
        </div>
    )
}
