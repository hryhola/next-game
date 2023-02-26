import { Box, Button, Container, Menu, Popover, Slider, Typography } from '@mui/material'
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
import { WSContext } from 'client/context/list/ws'
import { WSEvents } from 'uWebSockets/globalSocketEvents'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import { BrowserView, MobileView, isBrowser, isMobile } from 'react-device-detect'
import { AudioCtx } from 'client/context/list/audio'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'

export const ClickerContext = React.createContext<{
    players: ClickerPlayerData[]
    setPlayers: React.Dispatch<React.SetStateAction<ClickerPlayerData[]>>
}>({
    players: [],
    setPlayers: () => {}
})

export const Clicker = () => {
    const lobby = useContext(LobbyContext)
    const user = useContext(UserContext)
    const ws = useContext(WSContext)
    const audio = useContext(AudioCtx)

    const [isVolumeVisible, setIsVolumeVisible] = useState(false)

    const [players, setPlayers] = useState<ClickerPlayerData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const chatInputRef = useRef<HTMLInputElement | null>(null)

    const handleJoin = (data: WSEvents['Clicker-Join']) => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname), data.player])
    }

    const handleUpdate = (data: WSEvents['Clicker-Update']) => {
        setPlayers(data.updated.players)
    }

    useEffect(() => {
        ;(async () => {
            const [response, postError] = await api.post<Success | Failure>(URL.LobbyJoin, {
                lobbyId: lobby.lobbyId
            })

            if (!response || !response.success) {
                return console.error(String(postError))
            }

            lobby.setMembers(response.lobby.members)
            lobby.setGameName(response.game.name as 'Clicker')

            setPlayers(response.game.players)

            setIsLoading(false)
        })()
    }, [])

    useEffect(() => {
        ws.on('Clicker-Join', handleJoin)
        ws.on('Clicker-Update', handleUpdate)
    }, [])

    return (
        <ClickerContext.Provider value={{ players, setPlayers }}>
            <PlayersHeader members={players} isLoading={isLoading} />
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
                    },
                    {
                        type: 'popover',
                        header: audio.volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />,
                        view: () => (
                            <Box
                                sx={{
                                    width: '46px',
                                    backgroundColor: '#272727',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pb: 99
                                }}
                            >
                                <Slider
                                    sx={{
                                        '& input[type="range"]': {
                                            WebkitAppearance: 'slider-vertical'
                                        },
                                        height: 200,
                                        marginTop: 2,
                                        marginBottom: 2
                                    }}
                                    orientation="vertical"
                                    min={0}
                                    max={100}
                                    step={1}
                                    defaultValue={50}
                                    value={audio.volume}
                                    onChange={(event, value) => audio.setVolume(value as number)}
                                    aria-label="Volume"
                                />
                                <Button size="small" onClick={() => audio.toggleMute()}>
                                    {audio.volume === 0 ? 'Unmute' : 'Mute'}
                                </Button>
                            </Box>
                        )
                    }
                ]}
            />
        </ClickerContext.Provider>
    )
}
