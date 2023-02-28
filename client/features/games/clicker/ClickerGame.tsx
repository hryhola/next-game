import { Box, Button, IconButton, Slider } from '@mui/material'
import React, { useState, useRef, useEffect } from 'react'
import { chatInputHeight } from 'client/ui'
import { useLobby, useUser, useWS, useAudio, useRouter, useWSHandler } from 'client/context/list'
import OverlayedTabs, { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import ChatIcon from '@mui/icons-material/Chat'
import { api } from 'client/network-utils/api'
import { URL } from 'client/network-utils/const'
import { ClickerPlayerData } from 'state'
import { Chat } from 'client/features/chat/Chat'
import PlayersHeader from '../common/PlayersHeader'
import { Failure, Success } from 'pages/api/lobby-join'
import { WSEvents } from 'uWebSockets/globalSocketEvents'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import LogoutIcon from '@mui/icons-material/Logout'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import CheckIcon from '@mui/icons-material/Check'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'

export const ClickerContext = React.createContext<{
    players: ClickerPlayerData[]
    setPlayers: React.Dispatch<React.SetStateAction<ClickerPlayerData[]>>
}>({
    players: [],
    setPlayers: () => {}
})

export const Clicker = () => {
    const globalModal = useGlobalModal()

    const lobby = useLobby()
    const user = useUser()
    const ws = useWS()
    const audio = useAudio()
    const router = useRouter()

    const [players, setPlayers] = useState<ClickerPlayerData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const chatInputRef = useRef<HTMLInputElement | null>(null)

    const handleJoin = (data: WSEvents['Clicker-Join']) => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname), data.player])
    }

    const handleLeave = (data: WSEvents['Clicker-Leave']) => {
        setPlayers(ps => [...ps.filter(p => p.nickname !== data.player.nickname)])
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

    useWSHandler('Clicker-Join', handleJoin)
    useWSHandler('Clicker-Leave', handleLeave)
    useWSHandler('Clicker-Update', handleUpdate)

    const isCreatorView = user.nickname === lobby.members.find(m => m.isCreator)?.nickname

    return (
        <ClickerContext.Provider value={{ players, setPlayers }}>
            <PlayersHeader members={players} isLoading={isLoading} />
            <OverlayedTabs
                label="tic-tac-toe"
                views={[
                    {
                        onFullscreen: () => chatInputRef.current?.focus(),
                        header: <ChatIcon />,
                        view: ({ fullscreen }) => (
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
                        height: '270px',
                        hideIconOnOpen: false,
                        view: opts => (
                            <Box
                                sx={{
                                    width: '46px',
                                    backgroundColor: '#272727',
                                    display: 'flex',
                                    flexDirection: opts.direction === 'up' ? 'column' : 'column-reverse',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottomLeftRadius: '30px',
                                    borderBottomRightRadius: '30px',
                                    pb: opts.direction === 'up' ? 4 : 0
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
                                    onChange={(event, value) => {
                                        audio.setVolume(value as number)
                                    }}
                                    aria-label="Volume"
                                />
                                <Button size="small" sx={{ fontSize: 10, textTransform: 'none' }} onClick={() => audio.toggleMute()}>
                                    {audio.volume === 0 ? 'Unmute' : 'Mute'}
                                </Button>
                            </Box>
                        )
                    },
                    {
                        type: 'popover',
                        header: <MoreVertIcon />,
                        height: isCreatorView ? '78px' : '36px',
                        hideIconOnOpen: true,
                        view: opts => (
                            <Box
                                sx={{
                                    width: '46px',
                                    backgroundColor: '#272727',
                                    display: 'flex',
                                    flexDirection: opts.direction === 'up' ? 'column' : 'column-reverse',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottomLeftRadius: '30px',
                                    borderBottomRightRadius: '30px',
                                    pb: opts.direction === 'up' ? 4 : 0
                                }}
                            >
                                {isCreatorView && (
                                    <IconButton
                                        onClick={() =>
                                            globalModal.confirm({
                                                content: 'Destroy this lobby?',
                                                onConfirm: () => {
                                                    lobby.destroy()
                                                    router.setCurrentRoute('Home')
                                                }
                                            })
                                        }
                                    >
                                        <HighlightOffIcon />
                                    </IconButton>
                                )}
                                {true && (
                                    <IconButton onClick={() => ws.send('Lobby-StartReadyCheck', { lobbyId: lobby.lobbyId })}>
                                        <CheckIcon />
                                    </IconButton>
                                )}
                                <IconButton
                                    onClick={() =>
                                        globalModal.confirm({
                                            content: 'Want to leave?',
                                            onConfirm: () => {
                                                lobby.exit()
                                                router.setCurrentRoute('Home')
                                            }
                                        })
                                    }
                                >
                                    <LogoutIcon />
                                </IconButton>
                            </Box>
                        )
                    }
                ]}
                onViewOpen={() => (document.body.dataset.hideTips = 'true')}
                onViewClose={() => (document.body.dataset.hideTips = 'false')}
            />
        </ClickerContext.Provider>
    )
}
