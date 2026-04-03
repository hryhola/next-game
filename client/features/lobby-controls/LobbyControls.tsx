import React from 'react'
import { useAudio, useI18n, useLobby, useUser, useWS } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { useGame } from '../games/common/GameFactory'
import { cn } from 'client/ui/lib/cn'
import { ChatBox } from 'client/ui'
import { ChatMessageComponent } from 'client/ui/chat/ChatMessage'
import { Button, Slider } from 'client/ui/primitives'
import { Check, LogOut, MessageCircle, MoreHorizontal, OctagonX, Volume2, VolumeX, X } from 'lucide-react'
import type { TChatMessage } from 'shared/contracts/app'

interface LobbyControlsProps {
    buttons?: React.ReactNode[]
}

type ControlAction = {
    icon: React.ReactNode
    id: string
    label: string
    onClick: () => void
    variant?: 'secondary' | 'outlineDanger'
}

type ChatPreviewMessage = {
    id: string
    isFading: boolean
    message: TChatMessage
}

const controlIconClassName = 'size-6 shrink-0'
const iconButtonClassName = 'size-12 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-white/6'

export const LobbyControls: React.FC<LobbyControlsProps> = props => {
    const globalModal = useGlobalModal()
    const lobby = useLobby()
    const user = useUser()
    const ws = useWS()
    const audio = useAudio()
    const router = useClientRouter()
    const game = useGame()
    const { t } = useI18n()

    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = React.useState(false)
    const [isDesktopVolumeOpen, setIsDesktopVolumeOpen] = React.useState(false)
    const [isLobbyChatOpen, setIsLobbyChatOpen] = React.useState(false)
    const [isMobileVolumeOpen, setIsMobileVolumeOpen] = React.useState(false)
    const [chatPreviewMessages, setChatPreviewMessages] = React.useState<ChatPreviewMessage[]>([])

    const chatInputRef = React.useRef<HTMLInputElement | null>(null)
    const hasInitializedChatMessages = React.useRef(false)
    const seenChatMessageIds = React.useRef<Set<string>>(new Set())
    const previewTimeoutIds = React.useRef<Map<string, { fade: number; remove: number }>>(new Map())
    const rightControlsRef = React.useRef<HTMLDivElement | null>(null)

    const isReadyCheckButtonVisible = !game.isSessionStarted
    const isCreatorView = lobby.members.find(member => member.memberIsCreator)?.id === user.id
    const isBottomDockOccupied = lobby.activeBottomDock !== null

    const syncRightControlsHeight = React.useCallback(() => {
        const rightControls = rightControlsRef.current
        const height = rightControls ? Math.ceil(rightControls.getBoundingClientRect().height) : 0

        document.documentElement.style.setProperty('--lobbyControlsRightHeight', `${height}px`)
    }, [])

    const confirmDestroyLobby = () => {
        globalModal.confirm({
            title: t('lobbyControls.destroyTitle'),
            content: t('lobbyControls.destroyContent'),
            onConfirm: () => {
                lobby.destroy()
                router.setFrame('Home')
            }
        })
    }

    const confirmLeaveLobby = () => {
        globalModal.confirm({
            title: t('lobbyControls.leaveTitle'),
            content: t('lobbyControls.leaveContent'),
            onConfirm: () => {
                lobby.exit()
                router.setFrame('Home')
            }
        })
    }

    const menuActions: ControlAction[] = [
        ...(isCreatorView
            ? [
                  {
                      icon: <OctagonX className={controlIconClassName} strokeWidth={2.25} />,
                      id: 'destroy',
                      label: t('lobbyControls.destroyLobby'),
                      onClick: confirmDestroyLobby,
                      variant: 'outlineDanger' as const
                  }
              ]
            : []),
        ...(isReadyCheckButtonVisible
            ? [
                  {
                      icon: <Check className={controlIconClassName} strokeWidth={2.25} />,
                      id: 'ready-check',
                      label: t('lobbyControls.readyCheck'),
                      onClick: () => ws.send('Lobby-StartReadyCheck', { lobbyId: lobby.lobbyId }),
                      variant: 'secondary' as const
                  }
              ]
            : []),
        {
            icon: <LogOut className={controlIconClassName} strokeWidth={2.25} />,
            id: 'leave',
            label: t('lobbyControls.leaveLobby'),
            onClick: confirmLeaveLobby,
            variant: 'secondary'
        }
    ]

    const extraButtons = props.buttons || []

    const toggleDesktopVolume = () => {
        setIsDesktopVolumeOpen(current => !current)
    }

    const toggleLobbyChat = () => {
        setIsLobbyChatOpen(current => {
            const next = !current

            if (next) {
                setIsMobileVolumeOpen(false)
            }

            return next
        })
    }

    const toggleMobileVolume = () => {
        setIsMobileVolumeOpen(current => {
            const next = !current

            if (next) {
                setIsLobbyChatOpen(false)
            }

            return next
        })
    }

    const chatDockHeight = 'min(24rem, 44vh)'

    React.useEffect(() => {
        if (!isLobbyChatOpen) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsLobbyChatOpen(false)
            }
        }

        addEventListener('keydown', handleKeyDown)

        return () => removeEventListener('keydown', handleKeyDown)
    }, [isLobbyChatOpen])

    React.useEffect(() => {
        if (!isLobbyChatOpen) {
            return
        }

        const frameId = requestAnimationFrame(() => chatInputRef.current?.focus())

        return () => cancelAnimationFrame(frameId)
    }, [isLobbyChatOpen])

    React.useEffect(() => {
        setChatPreviewMessages([])
        hasInitializedChatMessages.current = false
        seenChatMessageIds.current = new Set()

        previewTimeoutIds.current.forEach(timeoutSet => {
            clearTimeout(timeoutSet.fade)
            clearTimeout(timeoutSet.remove)
        })
        previewTimeoutIds.current.clear()
    }, [lobby.lobbyId])

    React.useEffect(() => {
        if (!lobby.isChatHydrated) {
            return
        }

        if (!hasInitializedChatMessages.current) {
            seenChatMessageIds.current = new Set(lobby.chatMessages.map(message => message.id))
            hasInitializedChatMessages.current = true
            return
        }

        const newMessages = lobby.chatMessages.filter(message => !seenChatMessageIds.current.has(message.id))

        if (!newMessages.length) {
            return
        }

        newMessages.forEach(message => seenChatMessageIds.current.add(message.id))

        if (isLobbyChatOpen) {
            return
        }

        const incomingPreviewMessages = [...newMessages].reverse().map(message => ({ id: message.id, isFading: false, message }))

        setChatPreviewMessages(curr => [...curr, ...incomingPreviewMessages])

        incomingPreviewMessages.forEach(previewMessage => {
            const fadeTimeoutId = window.setTimeout(() => {
                setChatPreviewMessages(curr => curr.map(message => (message.id === previewMessage.id ? { ...message, isFading: true } : message)))
            }, 3000)

            const removeTimeoutId = window.setTimeout(() => {
                setChatPreviewMessages(curr => curr.filter(message => message.id !== previewMessage.id))
                previewTimeoutIds.current.delete(previewMessage.id)
            }, 3500)

            previewTimeoutIds.current.set(previewMessage.id, {
                fade: fadeTimeoutId,
                remove: removeTimeoutId
            })
        })
    }, [isLobbyChatOpen, lobby.chatMessages, lobby.isChatHydrated])

    React.useEffect(() => {
        return () => {
            previewTimeoutIds.current.forEach(timeoutSet => {
                clearTimeout(timeoutSet.fade)
                clearTimeout(timeoutSet.remove)
            })
            previewTimeoutIds.current.clear()
        }
    }, [])

    React.useEffect(() => {
        syncRightControlsHeight()

        const rightControls = rightControlsRef.current
        const resizeObserver = typeof ResizeObserver !== 'undefined' && rightControls ? new ResizeObserver(() => syncRightControlsHeight()) : null

        if (rightControls && resizeObserver) {
            resizeObserver.observe(rightControls)
        }

        addEventListener('resize', syncRightControlsHeight)
        addEventListener('orientationchange', syncRightControlsHeight)

        return () => {
            removeEventListener('resize', syncRightControlsHeight)
            removeEventListener('orientationchange', syncRightControlsHeight)
            resizeObserver?.disconnect()
            document.documentElement.style.setProperty('--lobbyControlsRightHeight', '0px')
        }
    }, [syncRightControlsHeight])

    const handleSendLobbyMessage = (text: string) => {
        ws.send('Chat-Send', {
            lobbyId: lobby.lobbyId,
            message: {
                from: user.userNickname,
                fromColor: user.userColor,
                id: crypto.randomUUID(),
                kind: 'chat',
                text
            },
            scope: 'lobby'
        })
    }

    return (
        <>
            <div
                className="pointer-events-none fixed left-0 right-0 z-30 hidden justify-between px-4 md:flex lg:px-6"
                style={{ top: 'calc(var(--playersHeaderHeight, 0px) + 16px)' }}
            >
                <div className="pointer-events-none flex flex-col items-start gap-3">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="pointer-events-auto size-12 rounded-full"
                        onClick={toggleDesktopVolume}
                        aria-label={isDesktopVolumeOpen ? t('lobbyControls.hideVolumeControls') : t('lobbyControls.showVolumeControls')}
                    >
                        {audio.volume === 0 ? (
                            <VolumeX className={controlIconClassName} strokeWidth={2.25} />
                        ) : (
                            <Volume2 className={controlIconClassName} strokeWidth={2.25} />
                        )}
                    </Button>

                    {isDesktopVolumeOpen ? (
                        <div className="glass-card pointer-events-none w-[18rem] rounded-[1.75rem] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs text-slate-300">{audio.volume}%</div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="pointer-events-auto h-8 rounded-full px-3 text-[0.5625em]! font-semibold tracking-[0.16em] text-slate-200"
                                    onClick={() => audio.toggleMute()}
                                    aria-label={audio.volume === 0 ? t('lobbyControls.unmuteLabel') : t('lobbyControls.muteLabel')}
                                >
                                    {audio.volume === 0 ? t('lobbyControls.unmute') : t('lobbyControls.mute')}
                                </Button>
                            </div>
                            <Slider
                                className="pointer-events-auto mt-3"
                                min={0}
                                max={100}
                                step={1}
                                value={[audio.volume]}
                                onValueChange={value => audio.setVolume(value[0] || 0)}
                                aria-label={t('lobbyControls.volume')}
                            />
                        </div>
                    ) : null}

                    <div className="flex flex-col items-start gap-2">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="pointer-events-auto size-12 rounded-full"
                            onClick={() => setIsDesktopMenuOpen(current => !current)}
                            aria-label={t('lobbyControls.menu')}
                        >
                            <MoreHorizontal className={controlIconClassName} strokeWidth={2.25} />
                        </Button>
                        <div
                            className={cn(
                                'flex min-w-[12rem] flex-col gap-2 overflow-hidden transition-all duration-200',
                                isDesktopMenuOpen ? 'pointer-events-auto max-h-64 opacity-100' : 'pointer-events-none max-h-0 opacity-0'
                            )}
                        >
                            {menuActions.map(action => (
                                <Button
                                    key={action.id}
                                    variant={action.variant || 'secondary'}
                                    size="sm"
                                    className="pointer-events-auto justify-start rounded-full px-4"
                                    onClick={() => {
                                        setIsDesktopMenuOpen(false)
                                        action.onClick()
                                    }}
                                >
                                    {action.icon}
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div ref={rightControlsRef} className="pointer-events-none flex flex-col items-end gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="pointer-events-auto h-12 rounded-full px-4"
                        onClick={toggleLobbyChat}
                        disabled={isBottomDockOccupied}
                    >
                        <MessageCircle className={controlIconClassName} strokeWidth={2.25} />
                        {t('common.chat')}
                    </Button>

                    {extraButtons.length ? (
                        <div className="pointer-events-none flex w-full flex-col items-end gap-2">
                            {extraButtons.map((button, index) => (
                                <div key={index} className="pointer-events-auto flex w-full justify-end">
                                    {button}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] md:hidden">
                {isMobileVolumeOpen ? (
                    <div className="glass-card pointer-events-none mb-3 w-full max-w-xs rounded-[1.75rem] p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-xs text-slate-300">{audio.volume}%</div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="pointer-events-auto h-8 rounded-full px-3 text-[0.5625em]! font-semibold tracking-[0.16em] text-slate-200"
                                onClick={() => audio.toggleMute()}
                                aria-label={audio.volume === 0 ? t('lobbyControls.unmuteLabel') : t('lobbyControls.muteLabel')}
                            >
                                {audio.volume === 0 ? t('lobbyControls.unmute') : t('lobbyControls.mute')}
                            </Button>
                        </div>
                        <Slider
                            className="pointer-events-auto mt-3"
                            min={0}
                            max={100}
                            step={1}
                            value={[audio.volume]}
                            onValueChange={value => audio.setVolume(value[0] || 0)}
                            aria-label={t('lobbyControls.volume')}
                        />
                    </div>
                ) : null}

                {extraButtons.length ? (
                    <div className="pointer-events-none mb-2 flex max-w-full flex-wrap justify-center gap-2">
                        {extraButtons.map((button, index) => (
                            <div key={index} className="pointer-events-auto min-w-[9rem] flex-1 basis-[9rem]">
                                {button}
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="glass-panel pointer-events-none flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full px-3 py-2">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="pointer-events-auto"
                        onClick={toggleLobbyChat}
                        disabled={isBottomDockOccupied}
                        aria-label={isLobbyChatOpen ? t('lobbyControls.hideChat') : t('lobbyControls.showChat')}
                    >
                        <MessageCircle className={controlIconClassName} strokeWidth={2.25} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="pointer-events-auto"
                        onClick={toggleMobileVolume}
                        aria-label={t('lobbyControls.adjustVolume')}
                    >
                        {audio.volume === 0 ? (
                            <VolumeX className={controlIconClassName} strokeWidth={2.25} />
                        ) : (
                            <Volume2 className={controlIconClassName} strokeWidth={2.25} />
                        )}
                    </Button>
                    {isReadyCheckButtonVisible ? (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="pointer-events-auto"
                            onClick={() => ws.send('Lobby-StartReadyCheck', { lobbyId: lobby.lobbyId })}
                            aria-label={t('lobbyControls.startReadyCheck')}
                        >
                            <Check className={controlIconClassName} strokeWidth={2.25} />
                        </Button>
                    ) : null}
                    {isCreatorView ? (
                        <Button
                            variant="outlineDanger"
                            size="icon"
                            className="pointer-events-auto"
                            onClick={confirmDestroyLobby}
                            aria-label={t('lobbyControls.destroyLobby')}
                        >
                            <OctagonX className={controlIconClassName} strokeWidth={2.25} />
                        </Button>
                    ) : null}
                    <Button
                        variant="secondary"
                        size="icon"
                        className="pointer-events-auto"
                        onClick={confirmLeaveLobby}
                        aria-label={t('lobbyControls.leaveLobby')}
                    >
                        <LogOut className={controlIconClassName} strokeWidth={2.25} />
                    </Button>
                </div>
            </div>

            <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] md:bottom-6">
                {!isBottomDockOccupied && isLobbyChatOpen ? (
                    <div className="glass-card pointer-events-auto w-full max-w-xl rounded-[2rem] p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">{t('lobbyControls.lobbyChat')}</div>
                                <div className="truncate text-sm text-slate-300">{lobby.lobbyId}</div>
                            </div>
                            <Button variant="ghost" size="icon" className={cn(iconButtonClassName, 'text-slate-200')} onClick={() => setIsLobbyChatOpen(false)}>
                                <X className={controlIconClassName} strokeWidth={2.25} />
                            </Button>
                        </div>
                        <div className="mt-3" style={{ height: chatDockHeight }}>
                            <ChatBox messages={lobby.chatMessages} onSendMessage={handleSendLobbyMessage} inputRef={chatInputRef} className="h-full" />
                        </div>
                    </div>
                ) : !isBottomDockOccupied && chatPreviewMessages.length ? (
                    <div className="pointer-events-none w-full max-w-xl text-sm text-slate-100">
                        <div className="flex flex-col gap-2">
                            {chatPreviewMessages.map(previewMessage => (
                                <div
                                    key={previewMessage.id}
                                    className={cn('transition-opacity duration-500', previewMessage.isFading ? 'opacity-0' : 'opacity-100')}
                                >
                                    <ChatMessageComponent message={previewMessage.message} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    )
}
