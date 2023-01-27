import { Container } from '@mui/material'
import React, { useState, useContext, useRef } from 'react'
import { TTicTacToePlayer } from 'state'
import { chatInputHeight, LoadingOverlay } from 'client/ui'
import { LobbyContext } from 'client/context/list/lobby'
import { Chat } from '../chat/Chat'
import Field from './Field'
import Header from './Header'
import OverlayedTabs, { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import ChatIcon from '@mui/icons-material/Chat'
import { UserContext } from 'client/context/list/user'

const TicTacToe = () => {
    const [players, setPlayers] = useState<TTicTacToePlayer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const chatInputRef = useRef<HTMLInputElement | null>(null)
    const lobby = useContext(LobbyContext)
    const user = useContext(UserContext)

    const isPlayable = players.some(p => p.user.nickname === user.username)

    return (
        <>
            <Container>
                <Field sx={{ my: 3 }} isLoading={isLoading} isPlayable={isPlayable} />
                <Header members={players} isLoading={isLoading} />
            </Container>
            <OverlayedTabs
                label="tic-tac-toe"
                views={[
                    {
                        onFullscreen: () => chatInputRef.current?.focus(),
                        header: <ChatIcon />,
                        view: fullscreen => (
                            <Chat
                                messagesWrapperBoxSx={{
                                    height: `calc(${fullscreen ? `100vh - ${overlayedTabsToolbarHeight}` : '50vh'} - ${chatInputHeight})`
                                }}
                                scope="lobby"
                                lobbyId={lobby.lobbyId}
                                inputRef={chatInputRef}
                            />
                        )
                    }
                ]}
            />
        </>
    )
}

export default TicTacToe
