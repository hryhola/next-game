import { render, type RenderOptions } from '@testing-library/react'
import { GameCtx, type GameCtxValue } from 'client/features/games/common/GameFactory'
import { AudioCtx } from 'client/context/list/audioCtx'
import { HomeProvider } from 'client/context/list/homeCtx'
import { LobbyProvider } from 'client/context/list/lobbyCtx'
import { SettingsProvider } from 'client/context/list/settingsCtx'
import { UserProvider } from 'client/context/list/userCtx'
import { WSContext, type WSData } from 'client/context/list/wsCtx'
import { ToastProvider } from 'client/ui/toast/ToastProvider'
import React from 'react'
import type { LobbyData, LobbyMemberData, PlayerData, ReadyCheckMember, UserData } from 'shared/contracts/app'

type TestWSHarness = {
    emit: (context: string, data: unknown) => void
    isConnected: boolean | null
    listeners: Map<string, Set<Function>>
    send: jest.Mock
    setIsConnected: jest.Mock
    value: WSData
}

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
    audio?: React.ContextType<typeof AudioCtx>
    game?: GameCtxValue | null
    lobby?: LobbyData
    user?: UserData
    ws?: TestWSHarness
}

export function createUserData(overrides: Partial<UserData> = {}): UserData {
    return {
        id: 'user-1',
        userAvatarUrl: '',
        userColor: '#ffffff',
        userIsOnline: true,
        userNickname: 'User 1',
        ...overrides
    }
}

export function createLobbyMemberData(overrides: Partial<LobbyMemberData> = {}): LobbyMemberData {
    return {
        id: 'member-1',
        memberIsCreator: false,
        memberIsPlayer: true,
        memberPosition: 1,
        memberRole: 'player',
        userAvatarUrl: '',
        userColor: '#ffffff',
        userIsOnline: true,
        userNickname: 'Member 1',
        ...overrides
    }
}

export function createReadyCheckMember(overrides: Partial<ReadyCheckMember> = {}): ReadyCheckMember {
    return {
        ...createLobbyMemberData(),
        ready: undefined,
        ...overrides
    }
}

export function createPlayerData(overrides: Partial<PlayerData> = {}): PlayerData {
    return {
        ...createLobbyMemberData(),
        playerIsMaster: false,
        playerScore: 0,
        ...overrides
    }
}

export function createLobbyData(overrides: Partial<LobbyData> = {}): LobbyData {
    return {
        creator: createUserData({
            id: 'creator',
            userNickname: 'Creator'
        }),
        gameName: 'Jeopardy',
        id: 'lobby-1',
        members: [
            createLobbyMemberData({
                id: 'creator',
                memberIsCreator: true,
                memberPosition: 0,
                userNickname: 'Creator'
            })
        ],
        private: false,
        readyCheck: null,
        ...overrides
    }
}

export function createAudioHarness(overrides: Partial<React.ContextType<typeof AudioCtx>> = {}): React.ContextType<typeof AudioCtx> {
    return {
        play: jest.fn().mockResolvedValue(undefined),
        setVolume: jest.fn(),
        stop: jest.fn(),
        toggleMute: jest.fn(),
        volume: 50,
        ...overrides
    }
}

export function createGameValue(overrides: Partial<GameCtxValue> = {}): GameCtxValue {
    const session = overrides.session ?? null

    return {
        initialData: {},
        isLoading: false,
        isSessionStarted: session !== null,
        players: [],
        session,
        ...overrides
    }
}

export function createWSHarness({ isConnected = true }: { isConnected?: boolean | null } = {}): TestWSHarness {
    const listeners = new Map<string, Set<Function>>()
    const send = jest.fn()
    const setIsConnected = jest.fn()

    const on = (context: string, handler: Function) => {
        const contextListeners = listeners.get(context) || new Set<Function>()

        contextListeners.add(handler)
        listeners.set(context, contextListeners)
    }

    const unsubscribe = (context: string, handler: Function) => {
        const contextListeners = listeners.get(context)

        if (!contextListeners) {
            return
        }

        contextListeners.delete(handler)

        if (contextListeners.size === 0) {
            listeners.delete(context)
        }
    }

    const value: WSData = {
        isConnected,
        on,
        send,
        setIsConnected,
        unsubscribe,
        wsRef: {
            current: null
        }
    }

    return {
        emit: (context, data) => {
            listeners.get(context)?.forEach(handler => handler(data))
        },
        isConnected,
        listeners,
        send,
        setIsConnected,
        value
    }
}

export function renderWithProviders(ui: React.ReactElement, options: RenderWithProvidersOptions = {}) {
    const {
        audio = createAudioHarness(),
        game = null,
        lobby = createLobbyData(),
        user = createUserData({
            id: lobby.members[0]?.id || 'user-1',
            userAvatarUrl: lobby.members[0]?.userAvatarUrl || '',
            userColor: lobby.members[0]?.userColor || '#ffffff',
            userIsOnline: lobby.members[0]?.userIsOnline ?? true,
            userNickname: lobby.members[0]?.userNickname || 'User 1'
        }),
        ws = createWSHarness(),
        ...renderOptions
    } = options

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const content = game ? <GameCtx.Provider value={game}>{children}</GameCtx.Provider> : children

        return (
            <SettingsProvider>
                <UserProvider user={user}>
                    <HomeProvider>
                        <LobbyProvider lobby={lobby}>
                            <AudioCtx.Provider value={audio}>
                                <WSContext.Provider value={ws.value}>
                                    <ToastProvider>{content}</ToastProvider>
                                </WSContext.Provider>
                            </AudioCtx.Provider>
                        </LobbyProvider>
                    </HomeProvider>
                </UserProvider>
            </SettingsProvider>
        )
    }

    return {
        audio,
        game,
        lobby,
        user,
        ws,
        ...render(ui, {
            wrapper: Wrapper,
            ...renderOptions
        })
    }
}
