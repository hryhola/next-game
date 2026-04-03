/** @jest-environment jsdom */

import { act, screen } from '@testing-library/react'
import { useLobby } from 'client/context/list'
import { createLobbyData, createLobbyMemberData, createUserData, createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'
import React from 'react'
import JeopardyAnnouncements from './JeopardyAnnouncements'

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

describe('JeopardyAnnouncements', () => {
    it('announces special picks and skipped themes in the lobby chat', () => {
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
                <JeopardyAnnouncements />
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
            ws.emit('Game-SessionAction', {
                actor: {
                    id: 'creator',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                payload: {
                    themeId: 'final-0'
                },
                result: {
                    success: true,
                    themeName: 'Final Theme'
                },
                type: '$SkipFinalTheme'
            })
        })

        expect(screen.getByText('Contestant 1 picked a Stake question in Wild Cats for 500.')).toBeInTheDocument()
        expect(screen.getByText('Creator skipped category Skipped Theme.')).toBeInTheDocument()
        expect(screen.getByText('Creator skipped final theme Final Theme.')).toBeInTheDocument()
    })

    it('ignores regular Jeopardy picks and actions from unknown actors', () => {
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
                })
            ]
        })

        renderWithProviders(
            <>
                <JeopardyAnnouncements />
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
                    id: 'creator',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                payload: {
                    questionId: '0-0-0'
                },
                result: {
                    questionPrice: 500,
                    questionTheme: 'Simple Theme',
                    questionType: 'simple',
                    success: true
                },
                type: '$PickQuestion'
            })
            ws.emit('Game-SessionAction', {
                actor: {
                    id: 'missing-player',
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

        expect(screen.queryByText(/picked a/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/skipped category/i)).not.toBeInTheDocument()
    })
})
