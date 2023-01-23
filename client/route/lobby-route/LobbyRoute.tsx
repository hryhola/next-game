import { LobbyContext } from 'client/context/list/lobby'
import { Chat } from 'client/ui'
import { useContext } from 'react'

export const LobbyRoute: React.FC = () => {
    const lobby = useContext(LobbyContext)

    const handleMessageSend = (message: string) => {}

    return (
        <>
            <>
                <main>game</main>
                <section>
                    {lobby.members.map(m => (
                        <div key={m.user.nickname}>{m.user.nickname}</div>
                    ))}
                </section>
            </>
            <aside>
                <button>КНОПКА</button>
            </aside>
        </>
    )
}
