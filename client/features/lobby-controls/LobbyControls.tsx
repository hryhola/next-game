import React from 'react'
import { chatInputHeight } from 'client/ui'
import OverlayedTabs, { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import { Chat } from 'client/features/chat/Chat'
import { useLobby, useUser, useWS, useAudio } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { useGame } from '../games/common/GameFactory'
import { Button, Slider } from 'client/ui/primitives'
import { MessageCircle, Volume2, VolumeX, MoreVertical, LogOut, OctagonX, Check } from 'lucide-react'

interface LobbyControlsProps {
    buttons?: React.ReactNode[]
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
                    header: <MessageCircle className="size-4" />,
                    view: ({ fullscreen }) => (
                        <div style={{ height: `calc(${fullscreen ? `var(--fullHeight) - ${overlayedTabsToolbarHeight}` : '50vh'} - ${chatInputHeight})` }}>
                            <Chat className="h-full p-4" scope="lobby" lobbyId={lobby.lobbyId} inputRef={chatInputRef} />
                        </div>
                    )
                },
                {
                    type: 'popover',
                    header: audio.volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />,
                    height: '270px',
                    hideIconOnOpen: false,
                    view: opts => (
                        <div
                            className="glass-panel flex w-[72px] items-center justify-center rounded-b-[30px] px-3"
                            style={{ flexDirection: opts.direction === 'up' ? 'column' : 'column-reverse', paddingBottom: opts.direction === 'up' ? 16 : 0 }}
                        >
                            <Slider
                                className="my-4 h-[200px]"
                                orientation="vertical"
                                min={0}
                                max={100}
                                step={1}
                                value={[audio.volume]}
                                onValueChange={value => audio.setVolume(value[0] || 0)}
                                aria-label="Volume"
                            />
                            <Button size="sm" variant="ghost" className="px-2 text-[10px]" onClick={() => audio.toggleMute()}>
                                {audio.volume === 0 ? 'Unmute' : 'Mute'}
                            </Button>
                        </div>
                    )
                },
                {
                    type: 'popover',
                    header: <MoreVertical className="size-4" />,
                    height: `${controlsHeight}px`,
                    hideIconOnOpen: true,
                    view: opts => (
                        <div
                            className="glass-panel flex w-[72px] items-center justify-center rounded-b-[30px] px-3"
                            style={{ flexDirection: opts.direction === 'up' ? 'column' : 'column-reverse', paddingBottom: opts.direction === 'up' ? 16 : 0 }}
                        >
                            {isCreatorView && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        globalModal.confirm({
                                            title: 'Destroy lobby',
                                            content: 'Destroy this lobby?',
                                            onConfirm: () => {
                                                lobby.destroy()
                                                router.setFrame('Home')
                                            }
                                        })
                                    }
                                >
                                    <OctagonX className="size-4" />
                                </Button>
                            )}
                            {isReadyCheckButtonVisible && (
                                <Button variant="ghost" size="icon" onClick={() => ws.send('Lobby-StartReadyCheck', { lobbyId: lobby.lobbyId })}>
                                    <Check className="size-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    globalModal.confirm({
                                        title: 'Leave lobby',
                                        content: 'Want to leave?',
                                        onConfirm: () => {
                                            lobby.exit()
                                            router.setFrame('Home')
                                        }
                                    })
                                }
                            >
                                <LogOut className="size-4" />
                            </Button>
                        </div>
                    )
                }
            ]}
            buttons={props.buttons}
            onViewOpen={() => (document.body.dataset.hideTips = 'true')}
            onViewClose={() => (document.body.dataset.hideTips = 'false')}
        />
    )
}
