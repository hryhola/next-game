/** @jest-environment jsdom */

import { act, screen } from '@testing-library/react'
import { useLobby } from 'client/context/list'
import {
    createAudioHarness,
    createLobbyData,
    createLobbyMemberData,
    createUserData,
    createWSHarness,
    renderWithProviders
} from 'client/test-utils/renderWithProviders'
import React from 'react'
import { LobbyFrame } from './LobbyFrame'

const mockSetFrame = jest.fn()

jest.mock('next/dynamic', () => {
    return () => {
        const DynamicGame = () => <div data-testid="dynamic-game" />

        return DynamicGame
    }
})

jest.mock('client/route/ClientRouter', () => ({
    useClientRouter: () => ({
        frame: 'Lobby',
        push: jest.fn(),
        refresh: jest.fn(),
        replace: jest.fn(),
        setFrame: mockSetFrame
    })
}))

jest.mock('client/features/ready-check/ReadyCheckDialog', () => ({
    ReadyCheckDialog: () => <div data-testid="ready-check-dialog" />
}))

const LobbyChatProbe: React.FC = () => {
    const lobby = useLobby()

    return (
        <div>
            {lobby.chatMessages.map(message => (
                <div key={message.id}>{message.text}</div>
            ))}
        </div>
    )
}

describe('LobbyFrame', () => {
    afterEach(() => {
        jest.restoreAllMocks()
        mockSetFrame.mockReset()
    })

    it('turns lobby join, leave, and tip realtime events into visible lobby notifications', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5)

        const ws = createWSHarness()
        const audio = createAudioHarness()
        const lobby = createLobbyData({
            gameName: 'Jeopardy',
            id: 'lobby-1',
            members: [
                createLobbyMemberData({
                    id: 'creator',
                    memberIsCreator: true,
                    memberPosition: 0,
                    userColor: '#ffffff',
                    userNickname: 'Creator'
                }),
                createLobbyMemberData({
                    id: 'contestant-1',
                    memberPosition: 1,
                    userColor: '#00ff00',
                    userNickname: 'Contestant 1'
                })
            ]
        })

        renderWithProviders(
            <>
                <LobbyFrame />
                <LobbyChatProbe />
            </>,
            {
                audio,
                lobby,
                user: createUserData({
                    id: 'creator',
                    userColor: '#ffffff',
                    userNickname: 'Creator'
                }),
                ws
            }
        )

        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            lobbyId: 'lobby-1',
            mode: 'subscribe',
            topic: 'all'
        })
        expect(ws.send).toHaveBeenCalledWith('Chat-Get', {
            lobbyId: 'lobby-1',
            scope: 'lobby'
        })

        act(() => {
            ws.emit('Lobby-Join', {
                lobbyId: 'lobby-1',
                member: createLobbyMemberData({
                    id: 'contestant-2',
                    memberPosition: 2,
                    userColor: '#ff00ff',
                    userNickname: 'Contestant 2'
                })
            })
            ws.emit('Lobby-Leave', {
                lobbyId: 'lobby-1',
                member: createLobbyMemberData({
                    id: 'contestant-2',
                    memberPosition: 2,
                    userColor: '#ff00ff',
                    userNickname: 'Contestant 2'
                })
            })
            ws.emit('Lobby-Tipped', {
                from: 'Contestant 1',
                lobbyId: 'lobby-1',
                to: 'Creator'
            })
        })

        expect(screen.getByText('Contestant 2 joined as player.')).toBeInTheDocument()
        expect(screen.getByText('Contestant 2 left the lobby.')).toBeInTheDocument()
        expect(screen.getByText('Contestant 1 tipped Creator.')).toBeInTheDocument()
        expect(audio.play).toHaveBeenCalledWith('comp_coin.wav')
    })

    it('does not announce game-specific Jeopardy actions from the lobby shell', () => {
        const ws = createWSHarness()
        const lobby = createLobbyData({
            gameName: 'Jeopardy',
            id: 'lobby-1',
            members: [
                createLobbyMemberData({
                    id: 'creator',
                    memberIsCreator: true,
                    memberPosition: 0,
                    userColor: '#ffffff',
                    userNickname: 'Creator'
                }),
                createLobbyMemberData({
                    id: 'contestant-1',
                    memberPosition: 1,
                    userColor: '#00ff00',
                    userNickname: 'Contestant 1'
                })
            ]
        })

        renderWithProviders(
            <>
                <LobbyFrame />
                <LobbyChatProbe />
            </>,
            {
                lobby,
                user: createUserData({
                    id: 'creator',
                    userNickname: 'Creator'
                }),
                ws
            }
        )

        act(() => {
            ws.emit('Game-SessionAction', {
                actor: {
                    id: 'contestant-1',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                payload: {
                    questionId: '0-0-0'
                },
                result: {
                    questionPrice: 500,
                    questionTheme: 'Wild Cats',
                    questionType: 'stake',
                    success: true
                },
                type: '$PickQuestion'
            })
            ws.emit('Game-SessionAction', {
                actor: {
                    id: 'creator',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                payload: {
                    themeId: '0-1'
                },
                result: {
                    success: true,
                    themeName: 'Skipped Theme'
                },
                type: '$SkipCategory'
            })
        })

        expect(screen.queryByText('Contestant 1 picked a Stake question in Wild Cats for 500.')).not.toBeInTheDocument()
        expect(screen.queryByText('Creator skipped category Skipped Theme.')).not.toBeInTheDocument()
    })

    it('shows a toast and routes home when the current user is kicked from the lobby', () => {
        const ws = createWSHarness()
        const lobby = createLobbyData({
            gameName: 'Jeopardy',
            id: 'lobby-1',
            members: [
                createLobbyMemberData({
                    id: 'creator',
                    memberIsCreator: true,
                    memberPosition: 0,
                    userNickname: 'Creator'
                }),
                createLobbyMemberData({
                    id: 'contestant-1',
                    memberPosition: 1,
                    userNickname: 'Contestant 1'
                })
            ]
        })

        renderWithProviders(<LobbyFrame />, {
            lobby,
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            }),
            ws
        })

        act(() => {
            ws.emit('Lobby-Kicked', {
                lobbyId: 'lobby-1',
                member: createLobbyMemberData({
                    id: 'contestant-1',
                    memberPosition: 1,
                    userNickname: 'Contestant 1'
                })
            })
        })

        expect(screen.getByText('Contestant 1 has been kicked')).toBeInTheDocument()
        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            lobbyId: 'lobby-1',
            mode: 'unsubscribe',
            topic: 'all'
        })
        expect(mockSetFrame).toHaveBeenCalledWith('Home')
    })
})
