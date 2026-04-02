/** @jest-environment jsdom */

import { screen } from '@testing-library/react'
import { createGameValue, createLobbyData, createPlayerData, createUserData, renderWithProviders } from 'client/test-utils/renderWithProviders'
import { FinalRoundBoard } from './JeopardyFinalRoundBoard'

const resources = {
    current: {
        Audio: {},
        Images: {},
        Video: {}
    }
}

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
            playerScore: 900,
            userNickname: 'Contestant 1'
        }),
        createPlayerData({
            id: 'contestant-2',
            memberPosition: 2,
            playerScore: 500,
            userNickname: 'Contestant 2'
        })
    ]
}

function createFinalFrame(overrides: Record<string, unknown> = {}) {
    return {
        id: 'final-round-board',
        phaseEndsAt: null,
        phaseStartedAt: null,
        phaseTimeLeft: null,
        playersThatAnswered: [],
        playersThatMadeBet: [],
        questionAtoms: [
            {
                content: 'Final clue',
                type: 'text'
            }
        ],
        skipperId: null,
        status: 'betting',
        themes: [{ name: 'Music', skipped: false }],
        ...overrides
    }
}

describe('FinalRoundBoard', () => {
    it('shows the current bet value to the eligible contestant during final betting', () => {
        const players = createPlayers()

        renderWithProviders(<FinalRoundBoard {...(createFinalFrame() as any)} Resources={resources as never} />, {
            game: createGameValue({
                players,
                session: {
                    frame: createFinalFrame(),
                    internal: {
                        finalBets: {
                            'contestant-1': 400
                        },
                        finalAnswers: {}
                    },
                    isPaused: false
                }
            }),
            lobby: createLobbyData({
                id: 'lobby-1',
                members: players
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getByText('Final Bet')).toBeInTheDocument()
        expect(screen.getByText('400')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Confirm Bet' })).toBeInTheDocument()
    })

    it('shows the final answer widget over the clue to contestants who still need to answer', () => {
        const players = createPlayers()

        renderWithProviders(<FinalRoundBoard {...(createFinalFrame({ status: 'answering' }) as any)} Resources={resources as never} />, {
            game: createGameValue({
                players,
                session: {
                    frame: createFinalFrame({
                        status: 'answering'
                    }),
                    internal: {
                        finalAnswers: {}
                    },
                    isPaused: false
                }
            }),
            lobby: createLobbyData({
                id: 'lobby-1',
                members: players
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getByText('Final clue')).toBeInTheDocument()
        expect(screen.getByText('Final Answer')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Submit Answer' })).toBeInTheDocument()
    })

    it('shows final-answer verification controls to the master with submitted answers', () => {
        const players = createPlayers()

        renderWithProviders(<FinalRoundBoard {...(createFinalFrame({ status: 'answer-verifying' }) as any)} Resources={resources as never} />, {
            game: createGameValue({
                players,
                session: {
                    frame: createFinalFrame({
                        status: 'answer-verifying'
                    }),
                    internal: {
                        correctAnswers: ['Correct'],
                        finalAnswers: {
                            'contestant-1': {
                                value: 'Answer 1'
                            }
                        },
                        incorrectAnswers: ['Wrong']
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

        expect(screen.getByText('Verify Final Answers')).toBeInTheDocument()
        expect(screen.getByText('Correct: Correct')).toBeInTheDocument()
        expect(screen.getByText('Incorrect: Wrong')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    })
})
