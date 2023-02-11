import { Container } from '@mui/material'
import React, { useState, useContext, useRef, useEffect } from 'react'
import { chatInputHeight } from 'client/ui'
import { LobbyContext } from 'client/context/list/lobby'
import OverlayedTabs, { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import ChatIcon from '@mui/icons-material/Chat'
import { UserContext } from 'client/context/list/user'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { ClickerPlayerData } from 'state'
import { Chat } from 'client/features/chat/Chat'
import PlayersHeader from '../common/PlayersHeader'
import { Failure, Success } from 'pages/api/lobby-join'

export const Clicker = () => {
    const lobby = useContext(LobbyContext)
    const user = useContext(UserContext)

    const [players, setPlayers] = useState<ClickerPlayerData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const chatInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        ;(async () => {
            const [response, postError] = await api.post<Success | Failure>(URL.LobbyJoin, {
                lobbyId: lobby.lobbyId
            })

            if (!response || !response.success) {
                return console.error(String(postError))
            }

            lobby.setMembers(response.lobby.members)
            setPlayers(response.game.players)

            setIsLoading(false)
        })()
    }, [])

    return (
        <>
            <Container>
                <PlayersHeader members={players} isLoading={isLoading} />
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
                                    height: `calc(${fullscreen ? `var(--fullHeight) - ${overlayedTabsToolbarHeight}` : '50vh'} - ${chatInputHeight})`
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
