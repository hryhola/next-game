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
    userNickname: 'Contestant 1'
})

const [TestGameView, useTestGame] = createGame<PlayerData, { phase: string }, { seed: string }>(() => {
    const game = useTestGame()

    return (
        <div>
            <div>{`players:${game.players.map(player => `${player.userNickname}:${player.playerScore}`).join('|')}`}</div>
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

        expect(screen.getByText('session:board')).toBeInTheDocument()
        expect(screen.getByText('initial:initial')).toBeInTheDocument()

        act(() => {
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
        expect(screen.getByText('session:none')).toBeInTheDocument()
    })
})
