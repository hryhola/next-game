import { useContext } from 'react'
import { GlobalChat } from 'client/features/global-chat/GlobalChat'
import { AuthContext } from 'client/context/auth.context'
import styles from './HomeRoute.module.scss'

export const HomeRoute: React.FC = () => {
    const auth = useContext(AuthContext)

    return (
        <div className={styles.container}>
            <main>Hello, {auth.username}</main>
            <section className={styles.chat}>
                <GlobalChat />
            </section>
        </div>
    )
}
