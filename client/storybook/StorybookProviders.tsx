'use client'

import * as React from 'react'
import { ViewportHeight } from 'client/app/ViewportHeight'
import { AudioCtx } from 'client/context/list/audioCtx'
import { HomeContext } from 'client/context/list/homeCtx'
import { LobbyContext, type LobbyCtxValue } from 'client/context/list/lobbyCtx'
import { UserContext } from 'client/context/list/userCtx'
import { WSContext, type WSData } from 'client/context/list/wsCtx'
import { GlobalModalProvider } from 'client/features/global-modal/GlobalModal'
import { SvgFilters } from 'client/ui/filters/SvgFilters'
import { ToastProvider } from 'client/ui/toast/ToastProvider'
import type { LobbyData, TChatMessage, UserData } from 'state'
import { storybookLobby, storybookUser } from './mocks'

type Props = {
    children: React.ReactNode
    user?: UserData
    lobby?: LobbyData
}

const cloneUser = (user: UserData): UserData => ({
    ...user
})

const cloneLobby = (lobby: LobbyData): LobbyData => ({
    ...lobby,
    creator: { ...lobby.creator },
    members: lobby.members.map(member => ({ ...member })),
    readyCheck: lobby.readyCheck
        ? {
              members: lobby.readyCheck.members.map(member => ({ ...member }))
          }
        : null
})

export const StorybookProviders: React.FC<Props> = ({ children, user, lobby }) => {
    const initialUser = cloneUser(user || storybookUser)
    const initialLobby = cloneLobby(lobby || storybookLobby)

    const wsRef = React.useRef<WebSocket | null>(null)
    const listenersRef = React.useRef<Record<string, Set<Function>>>({})

    const [userId, setUserId] = React.useState(initialUser.id)
    const [userNickname, setUserNickname] = React.useState(initialUser.userNickname)
    const [userColor, setUserColor] = React.useState(initialUser.userColor)
    const [userAvatarUrl, setUserAvatarUrl] = React.useState(initialUser.userAvatarUrl || '')

    const [members, setMembers] = React.useState(initialLobby.members)
    const [lobbyId, setLobbyId] = React.useState(initialLobby.id)
    const [gameName, setGameName] = React.useState(initialLobby.gameName)
    const [chatMessages, setChatMessages] = React.useState<TChatMessage[]>([])
    const [readyCheck, setReadyCheck] = React.useState(Boolean(initialLobby.readyCheck))
    const [readyCheckMembers, setReadyCheckMembers] = React.useState(initialLobby.readyCheck?.members || [])

    const [isProfileEditOpen, setIsProfileEditOpen] = React.useState(false)
    const [isNavigationOpen, setIsNavigationOpen] = React.useState(false)
    const [isCreateLobbyOpen, setIsCreateLobbyOpen] = React.useState(false)

    const [volume, setVolume] = React.useState(50)

    const on = React.useCallback<WSData['on']>((context, handler) => {
        listenersRef.current[context] = listenersRef.current[context] || new Set()
        listenersRef.current[context].add(handler)
    }, [])

    const unsubscribe = React.useCallback<WSData['unsubscribe']>((context, handler) => {
        listenersRef.current[context]?.delete(handler)
    }, [])

    const send = React.useCallback<WSData['send']>(() => {
        return
    }, [])

    const wsValue = React.useMemo<WSData>(
        () => ({
            wsRef,
            isConnected: true,
            setIsConnected: () => {},
            on,
            send,
            unsubscribe
        }),
        [on, send, unsubscribe]
    )

    const lobbyValue: LobbyCtxValue = {
        members,
        setMembers,
        lobbyId,
        setLobbyId,
        gameName,
        setGameName,
        chatMessages,
        setChatMessages,
        readyCheck,
        setReadyCheck,
        readyCheckMembers,
        setReadyCheckMembers,
        exit: () => setLobbyId(''),
        destroy: () => setLobbyId(''),
        reset: () => {
            setMembers([])
            setLobbyId('')
            setChatMessages([])
            setReadyCheck(false)
            setReadyCheckMembers([])
        },
        get myRole() {
            return members.find(member => member.id === userId)?.memberRole || 'spectator'
        }
    }

    return (
        <ToastProvider>
            <UserContext.Provider
                value={{
                    id: userId,
                    setId: setUserId,
                    userNickname,
                    setNickname: setUserNickname,
                    userColor,
                    setNicknameColor: setUserColor,
                    userAvatarUrl,
                    setAvatarRes: setUserAvatarUrl
                }}
            >
                <WSContext.Provider value={wsValue}>
                    <LobbyContext.Provider value={lobbyValue}>
                        <HomeContext.Provider
                            value={{
                                isProfileEditOpen,
                                setIsProfileEditOpen,
                                isNavigationOpen,
                                setIsNavigationOpen,
                                isCreateLobbyOpen,
                                setIsCreateLobbyOpen
                            }}
                        >
                            <AudioCtx.Provider
                                value={{
                                    play: async () => {},
                                    setVolume,
                                    toggleMute: () => setVolume(current => (current === 0 ? 50 : 0)),
                                    volume
                                }}
                            >
                                <ViewportHeight />
                                <SvgFilters />
                                <GlobalModalProvider>{children}</GlobalModalProvider>
                            </AudioCtx.Provider>
                        </HomeContext.Provider>
                    </LobbyContext.Provider>
                </WSContext.Provider>
            </UserContext.Provider>
        </ToastProvider>
    )
}
