/** @jest-environment jsdom */

import { act, screen } from '@testing-library/react'
import { createGameValue, createLobbyData, createPlayerData, createUserData, createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'
import React from 'react'
import JeopardyPlayersHeader from './JeopardyPlayersHeader'

jest.mock('client/features/games/common/PlayerMenu', () => ({
    PlayerMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

function getPlayerContainer(name: string) {
    return screen.getByText(name).parentElement as HTMLElement
}

describe('JeopardyPlayersHeader', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it('highlights the active picker from the current Jeopardy frame', () => {
        const players = [
            createPlayerData({
                id: 'master',
                memberIsCreator: true,
                memberPosition: 0,
                playerIsMaster: true,
                userNickname: 'Master'
            }),
            createPlayerData({
                id: 'contestant-1',
                memberPosition: 1,
                userNickname: 'Contestant 1'
            }),
            createPlayerData({
                id: 'contestant-2',
                memberPosition: 2,
                userNickname: 'Contestant 2'
            })
        ]

        renderWithProviders(<JeopardyPlayersHeader />, {
            game: createGameValue({
                players,
                session: {
                    frame: {
                        id: 'question-board',
                        pickerId: 'contestant-1',
                        roundId: 0,
                        themes: []
                    },
                    isPaused: false
                }
            }),
            lobby: createLobbyData({
                id: 'lobby-1',
                members: players
            }),
            user: createUserData({
                id: 'master',
                userNickname: 'Master'
            })
        })

        expect(getPlayerContainer('Contestant 1')).toHaveClass('bg-gradient-to-t')
        expect(getPlayerContainer('Contestant 2')).not.toHaveClass('bg-gradient-to-t')
    })

    it('temporarily highlights a contestant who gets put on cooldown by an early buzz', () => {
        const ws = createWSHarness()
        const players = [
            createPlayerData({
                id: 'master',
                memberIsCreator: true,
                memberPosition: 0,
                playerIsMaster: true,
                userNickname: 'Master'
            }),
            createPlayerData({
                id: 'contestant-1',
                memberPosition: 1,
                userNickname: 'Contestant 1'
            }),
            createPlayerData({
                id: 'contestant-2',
                memberPosition: 2,
                userNickname: 'Contestant 2'
            })
        ]

        renderWithProviders(<JeopardyPlayersHeader />, {
            game: createGameValue({
                players,
                session: {
                    frame: {
                        id: 'question-board',
                        pickerId: 'contestant-1',
                        roundId: 0,
                        themes: []
                    },
                    isPaused: false
                }
            }),
            lobby: createLobbyData({
                id: 'lobby-1',
                members: players
            }),
            user: createUserData({
                id: 'master',
                userNickname: 'Master'
            }),
            ws
        })

        act(() => {
            ws.emit('Game-SessionAction', {
                actor: {
                    id: 'contestant-2',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                result: {
                    isPlayerOnCooldown: true,
                    success: true
                },
                type: '$AnswerRequest'
            })
        })

        expect(getPlayerContainer('Contestant 2')).toHaveClass('bg-gradient-to-t')

        act(() => {
            jest.advanceTimersByTime(500)
        })

        expect(getPlayerContainer('Contestant 2')).not.toHaveClass('bg-gradient-to-t')
    })
})
