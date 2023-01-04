import { useContext, useState } from 'react'
import { GlobalChat } from 'client/features/global-chat/GlobalChat'
import { Header } from 'client/features/header/Header'
import { AuthContext } from 'client/context/list/auth.context'
import { Modal } from 'client/ui/modal/Modal'
import styles from './HomeRoute.module.scss'
import { LobbyCreator } from 'client/features/lobby-creator/LobbyCreator'
import { LobbyBrowser } from 'client/features/lobby-browser/LobbyBrowser'
import HomeTabs from 'client/features/home-tabs/HomeTabs'
import { Box } from '@mui/material'

export const HomeRoute: React.FC = () => {
    const [isCreateLobbyVisible, setIsCreateLobbyVisible] = useState(false)
    const [isLobbyListVisible, setIsLobbyListVisible] = useState(false)

    const auth = useContext(AuthContext)

    const openLobbyCreationModel = () => setIsCreateLobbyVisible(true)
    const openLobbyListModel = () => setIsLobbyListVisible(true)

    return (
        <>
            <Header />
            <HomeTabs />
            {/* <div className={styles.container}>
                <main>
                    Hello, {auth.username}
                    <button onClick={openLobbyCreationModel}>Create lobby</button>
                    <button onClick={openLobbyListModel}>Search for lobbies</button>
                </main>
                <section className={styles.chat}>
                    <GlobalChat />
                </section>
            </div>
            <Modal isOpen={isCreateLobbyVisible} setIsOpen={setIsCreateLobbyVisible} content={LobbyCreator} />
            <Modal isOpen={isLobbyListVisible} setIsOpen={setIsLobbyListVisible} content={LobbyBrowser} /> */}
        </>
    )
}
