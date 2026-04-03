/** @jest-environment jsdom */

import { act, screen } from '@testing-library/react'
import React from 'react'
import { GameCtx, type GameCtxValue } from 'client/features/games/common/GameFactory'
import { createGameValue, createLobbyData, createPlayerData, createUserData, renderWithProviders } from 'client/test-utils/renderWithProviders'
import JeopardyPreSession from './JeopardyPreSession'

function createPlayers() {
    return [
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
        })
    ]
}

describe('JeopardyPreSession', () => {
    it('shows a pause edge-glow overlay without the loading overlay blur when the session is paused', () => {
        const players = createPlayers()

        renderWithProviders(<JeopardyPreSession isPackLoading={false} />, {
            game: createGameValue({
                players,
                session: {
                    frame: {
                        id: 'question-content'
                    },
                    isPaused: true
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

        const pauseOverlay = screen.getByRole('status', { name: 'Pause' })

        expect(pauseOverlay).toBeInTheDocument()
        expect(screen.getByTestId('jeopardy-pause-overlay')).toBeInTheDocument()
        expect(pauseOverlay).toHaveClass('pointer-events-none')
        expect(document.querySelector('.backdrop-blur-sm')).toBeNull()
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('keeps using the loading overlay while the pack is still loading', () => {
        const players = createPlayers()

        renderWithProviders(<JeopardyPreSession isPackLoading />, {
            game: createGameValue({
                players,
                session: null
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

        expect(screen.getByText('Pack loading')).toBeInTheDocument()
        expect(document.querySelector('.backdrop-blur-sm')).not.toBeNull()
    })

    it('fades the pause glow out before removing it on resume', () => {
        jest.useFakeTimers()

        const players = createPlayers()
        const lobby = createLobbyData({
            id: 'lobby-1',
            members: players
        })
        const user = createUserData({
            id: 'master',
            userNickname: 'Master'
        })
        const renderUi = (game: GameCtxValue) => (
            <GameCtx.Provider value={game}>
                <JeopardyPreSession isPackLoading={false} />
            </GameCtx.Provider>
        )

        const pausedGame = createGameValue({
            players,
            session: {
                frame: {
                    id: 'question-content'
                },
                isPaused: true
            }
        })
        const activeGame = createGameValue({
            players,
            session: {
                frame: {
                    id: 'question-content'
                },
                isPaused: false
            }
        })

        const view = renderWithProviders(renderUi(pausedGame), {
            lobby,
            user
        })

        expect(screen.getByTestId('jeopardy-pause-overlay')).toHaveClass('jeopardy-pause-glow-visible')

        view.rerender(renderUi(activeGame))

        expect(screen.getByTestId('jeopardy-pause-overlay')).toHaveClass('jeopardy-pause-glow-leave')

        act(() => {
            jest.advanceTimersByTime(220)
        })

        expect(screen.queryByTestId('jeopardy-pause-overlay')).not.toBeInTheDocument()

        jest.useRealTimers()
    })
})
