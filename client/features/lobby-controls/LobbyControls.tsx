import React from 'react'
import { Box, Button, IconButton, Slider } from '@mui/material'
import { chatInputHeight } from 'client/ui'
import OverlayedTabs, { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import ChatIcon from '@mui/icons-material/Chat'
import { Chat } from 'client/features/chat/Chat'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import LogoutIcon from '@mui/icons-material/Logout'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import CheckIcon from '@mui/icons-material/Check'
import { useLobby, useUser, useWS, useAudio } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { useGame } from '../games/common/GameFactory'

interface LobbyControlsProps {
    buttons?: JSX.Element[]
}

export const LobbyControls: React.FC<LobbyControlsProps> = props => {
    const globalModal = useGlobalModal()
    const lobby = useLobby()
    const user = useUser()
    const ws = useWS()
    const audio = useAudio()
    const router = useClientRouter()
    const game = useGame()

    const [isReadyCheckButtonVisible, setIsReadyCheckVisible] = React.useState(!game.isSessionStarted)

    const chatInputRef = React.useRef<HTMLInputElement | null>(null)

    React.useEffect(() => {
        setIsReadyCheckVisible(!game.isSessionStarted)
    }, [game.isSessionStarted])

    const isCreatorView = user.userNickname === lobby.members.find(m => m.memberIsCreator)?.userNickname

    let controlsHeight = 0

    if (isCreatorView) {
        controlsHeight += 36
    }

    if (isReadyCheckButtonVisible) {
        controlsHeight += 36
    }

    return (
        <OverlayedTabs
            label="controls"
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
                    height: `${controlsHeight}px`,
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
                                                router.setFrame('Home')
                                            }
                                        })
                                    }
                                >
                                    <HighlightOffIcon />
                                </IconButton>
                            )}
                            {isReadyCheckButtonVisible && (
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
                                            router.setFrame('Home')
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
            buttons={props.buttons}
            onViewOpen={() => (document.body.dataset.hideTips = 'true')}
            onViewClose={() => (document.body.dataset.hideTips = 'false')}
        />
    )
}
