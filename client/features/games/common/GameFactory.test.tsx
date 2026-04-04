/** @jest-environment jsdom */

import { act, screen, waitFor } from '@testing-library/react'
import { createGame } from './GameFactory'
import { createGameValue, createLobbyData, createPlayerData, createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'
import React from 'react'
import type { PlayerData } from 'shared/contracts/app'
import { api } from 'client/network-utils/api'

jest.mock('client/network-utils/api', () => ({
    api: {
        post: jest.fn()
    }
}))

const postMock = api.post as jest.Mock

const initialPlayer = createPlayerData({
    id: 'contestant-1',
    memberPosition: 1,
    playerScore: 100,
    userIsOnline: false,
    userNickname: 'Contestant 1'
})

const [TestGameView, useTestGame] = createGame<PlayerData, { phase: string }, { seed: string }>(() => {
    const game = useTestGame()

    return (
        <div>
            <div>{`players:${game.players.map(player => `${player.userNickname}:${player.playerScore}`).join('|')}`}</div>
            <div>{`presence:${game.players.map(player => `${player.userNickname}:${player.userIsOnline ? 'online' : 'offline'}`).join('|')}`}</div>
            <div>{`session:${game.session ? game.session.phase : 'none'}`}</div>
            <div>{`initial:${game.initialData.seed}`}</div>
        </div>
    )
})

describe('createGame', () => {
    beforeEach(() => {
        postMock.mockResolvedValue([
            {
                success: true,
                game: {
                    initialData: {
                        seed: 'initial'
                    },
                    name: 'Jeopardy',
                    players: [initialPlayer],
                    session: {
                        phase: 'board'
                    }
                },
                lobby: createLobbyData({
                    id: 'lobby-1',
                    members: [createPlayerData({ id: 'contestant-1', userNickname: 'Contestant 1' })]
                })
            },
            undefined
        ])
    })

    afterEach(() => {
        postMock.mockReset()
    })

    it('hydrates from lobby-data and reflects player and session updates from realtime worker events', async () => {
        const ws = createWSHarness()

        renderWithProviders(<TestGameView />, {
            lobby: createLobbyData({
                id: 'lobby-1',
                members: [createPlayerData({ id: 'contestant-1', userNickname: 'Contestant 1' })]
            }),
            ws
        })

        await waitFor(() => {
            expect(screen.getByText('players:Contestant 1:100')).toBeInTheDocument()
        })

        expect(screen.getByText('presence:Contestant 1:offline')).toBeInTheDocument()
        expect(screen.getByText('session:board')).toBeInTheDocument()
        expect(screen.getByText('initial:initial')).toBeInTheDocument()

        act(() => {
            ws.emit('Lobby-MemberUpdate', {
                data: {
                    id: 'contestant-1',
                    userIsOnline: true
                },
                lobbyId: 'lobby-1'
            })
            ws.emit('Game-Join', {
                player: createPlayerData({
                    id: 'contestant-2',
                    memberPosition: 2,
                    playerScore: 50,
                    userNickname: 'Contestant 2'
                })
            })
            ws.emit('Game-PlayerUpdate', {
                data: {
                    playerScore: 300
                },
                id: 'contestant-1'
            })
            ws.emit('Game-SessionUpdate', {
                data: {
                    phase: 'question'
                },
                lobbyId: 'lobby-1'
            })
            ws.emit('Game-SessionUpdate', {
                data: {
                    phase: 'wrong-lobby'
                },
                lobbyId: 'lobby-2'
            })
        })

        expect(screen.getByText('players:Contestant 1:300|Contestant 2:50')).toBeInTheDocument()
        expect(screen.getByText('presence:Contestant 1:online|Contestant 2:online')).toBeInTheDocument()
        expect(screen.getByText('session:question')).toBeInTheDocument()

        act(() => {
            ws.emit('Game-Leave', {
                player: {
                    id: 'contestant-2'
                }
            })
            ws.emit('Game-SessionEnd', {
                lobbyId: 'lobby-1'
            })
        })

        expect(screen.getByText('players:Contestant 1:300')).toBeInTheDocument()
        expect(screen.getByText('presence:Contestant 1:online')).toBeInTheDocument()
        expect(screen.getByText('session:none')).toBeInTheDocument()
    })

    it('prefers the latest live lobby snapshot over an older in-flight lobby-data response', async () => {
        const ws = createWSHarness()
        let resolvePost: ((value: unknown) => void) | null = null

        postMock.mockReset()
        postMock.mockImplementation(
            () =>
                new Promise(resolve => {
                    resolvePost = resolve
                })
        )

        renderWithProviders(<TestGameView />, {
            lobby: createLobbyData({
                id: 'lobby-1',
                members: [createPlayerData({ id: 'contestant-1', userNickname: 'Contestant 1', userIsOnline: false })]
            }),
            ws
        })

        act(() => {
            ws.emit('Lobby-Snapshot', {
                game: {
                    initialData: {
                        seed: 'live'
                    },
                    name: 'Jeopardy',
                    players: [
                        createPlayerData({
                            id: 'contestant-1',
                            memberPosition: 1,
                            playerScore: 125,
                            userIsOnline: true,
                            userNickname: 'Contestant 1'
                        })
                    ],
                    session: {
                        phase: 'live-board'
                    }
                },
                lobby: createLobbyData({
                    id: 'lobby-1',
                    members: [createPlayerData({ id: 'contestant-1', userNickname: 'Contestant 1', userIsOnline: true })]
                }),
                lobbyId: 'lobby-1'
            })
        })

        expect(screen.getByText('players:Contestant 1:125')).toBeInTheDocument()
        expect(screen.getByText('presence:Contestant 1:online')).toBeInTheDocument()
        expect(screen.getByText('session:live-board')).toBeInTheDocument()
        expect(screen.getByText('initial:live')).toBeInTheDocument()

        await act(async () => {
            resolvePost?.([
                {
                    success: true,
                    game: {
                        initialData: {
                            seed: 'stale'
                        },
                        name: 'Jeopardy',
                        players: [
                            createPlayerData({
                                id: 'contestant-1',
                                memberPosition: 1,
                                playerScore: 100,
                                userIsOnline: false,
                                userNickname: 'Contestant 1'
                            })
                        ],
                        session: {
                            phase: 'stale-board'
                        }
                    },
                    lobby: createLobbyData({
                        id: 'lobby-1',
                        members: [createPlayerData({ id: 'contestant-1', userNickname: 'Contestant 1', userIsOnline: false })]
                    })
                },
                undefined
            ])
        })

        expect(screen.getByText('players:Contestant 1:125')).toBeInTheDocument()
        expect(screen.getByText('presence:Contestant 1:online')).toBeInTheDocument()
        expect(screen.getByText('session:live-board')).toBeInTheDocument()
        expect(screen.getByText('initial:live')).toBeInTheDocument()
    })
})
