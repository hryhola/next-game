/** @jest-environment jsdom */

import { fireEvent, screen } from '@testing-library/react'
import {
    createAudioHarness,
    createGameValue,
    createLobbyData,
    createPlayerData,
    createUserData,
    renderWithProviders
} from 'client/test-utils/renderWithProviders'
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
    it('renders final-round media atoms inside the same fullscreen-capable card presentation', () => {
        const players = createPlayers()

        renderWithProviders(
            <FinalRoundBoard
                {...(createFinalFrame({
                    questionAtoms: [
                        {
                            content: '/assets/final-question.jpg',
                            type: 'image'
                        }
                    ],
                    status: 'answering'
                }) as any)}
                Resources={resources as never}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createFinalFrame({
                            questionAtoms: [
                                {
                                    content: '/assets/final-question.jpg',
                                    type: 'image'
                                }
                            ],
                            playersThatAnswered: ['contestant-1'],
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
                    id: 'master',
                    userNickname: 'Master'
                })
            }
        )

        const mediaShell = screen.getByTestId('jeopardy-media-shell')
        const mediaCard = screen.getByTestId('jeopardy-media-card')
        const fullscreenButton = screen.getByRole('button', { name: 'Fullscreen' })

        expect(mediaShell).toHaveAttribute('data-expanded', 'false')
        expect(mediaCard.contains(fullscreenButton)).toBe(false)

        fireEvent.click(fullscreenButton)

        expect(mediaShell).toHaveAttribute('data-expanded', 'true')
        expect(screen.getByRole('button', { name: 'Back to Card' })).toBeInTheDocument()
    })

    it('autoplays final-round voice atoms at the current lobby volume and reacts to pause and resume actions', () => {
        const players = createPlayers()
        const audio = createAudioHarness({
            volume: 30
        })
        const pauseSpy = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
        const playSpy = jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => undefined)
        const { ws } = renderWithProviders(
            <FinalRoundBoard
                {...(createFinalFrame({
                    questionAtoms: [
                        {
                            content: '/assets/final-question.mp3',
                            type: 'voice'
                        }
                    ],
                    status: 'answering'
                }) as any)}
                Resources={resources as never}
            />,
            {
                audio,
                game: createGameValue({
                    players,
                    session: {
                        frame: createFinalFrame({
                            questionAtoms: [
                                {
                                    content: '/assets/final-question.mp3',
                                    type: 'voice'
                                }
                            ],
                            playersThatAnswered: ['contestant-1'],
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
                    id: 'master',
                    userNickname: 'Master'
                })
            }
        )

        const audioElement = screen.getByTestId('jeopardy-audio-card').querySelector('audio') as HTMLAudioElement

        expect(audioElement.autoplay).toBe(true)
        expect(audioElement.volume).toBeCloseTo(0.3)

        ws.emit('Game-SessionAction', {
            actor: {
                id: 'game',
                type: 'game'
            },
            lobbyId: 'lobby-1',
            payload: null,
            result: {
                success: true
            },
            type: '$Pause'
        })
        ws.emit('Game-SessionAction', {
            actor: {
                id: 'game',
                type: 'game'
            },
            lobbyId: 'lobby-1',
            payload: null,
            result: {
                success: true
            },
            type: '$Resume'
        })

        expect(pauseSpy).toHaveBeenCalled()
        expect(playSpy).toHaveBeenCalled()

        pauseSpy.mockRestore()
        playSpy.mockRestore()
    })

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

        renderWithProviders(<FinalRoundBoard {...(createFinalFrame({ phaseTimeLeft: 55, status: 'answering' }) as any)} Resources={resources as never} />, {
            game: createGameValue({
                players,
                session: {
                    frame: createFinalFrame({
                        phaseTimeLeft: 55,
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
        const progressBar = screen.getByRole('progressbar')

        expect(screen.getByRole('button', { name: 'Submit Answer' }).closest('.glass-card')?.contains(progressBar)).toBe(true)
        expect(screen.getByRole('button', { name: 'Submit Answer' })).toBeInTheDocument()
    })

    it('shows final-answer verification controls to the master with submitted answers', () => {
        const players = createPlayers()

        renderWithProviders(
            <FinalRoundBoard {...(createFinalFrame({ phaseTimeLeft: 70, status: 'answer-verifying' }) as any)} Resources={resources as never} />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createFinalFrame({
                            phaseTimeLeft: 70,
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
            }
        )

        expect(screen.getByText('Verify Final Answers')).toBeInTheDocument()
        expect(screen.getByText('Correct: Correct')).toBeInTheDocument()
        expect(screen.getByText('Incorrect: Wrong')).toBeInTheDocument()
        const progressBar = screen.getByRole('progressbar')

        expect(screen.getByRole('button', { name: 'Approve' }).closest('.glass-card')?.contains(progressBar)).toBe(true)
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    })

    it('keeps the final-answer timer at the bottom for viewers who are not answering', () => {
        const players = createPlayers()

        renderWithProviders(<FinalRoundBoard {...(createFinalFrame({ phaseTimeLeft: 55, status: 'answering' }) as any)} Resources={resources as never} />, {
            game: createGameValue({
                players,
                session: {
                    frame: createFinalFrame({
                        phaseTimeLeft: 55,
                        playersThatAnswered: ['contestant-1'],
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
                id: 'master',
                userNickname: 'Master'
            })
        })

        const progressBar = screen.getByRole('progressbar')

        expect(progressBar.closest('.glass-card')).toBeNull()
    })

    it('keeps the final verification timer at the bottom for non-master viewers', () => {
        const players = createPlayers()

        renderWithProviders(
            <FinalRoundBoard {...(createFinalFrame({ phaseTimeLeft: 70, status: 'answer-verifying' }) as any)} Resources={resources as never} />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createFinalFrame({
                            phaseTimeLeft: 70,
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
                    id: 'contestant-1',
                    userNickname: 'Contestant 1'
                })
            }
        )

        const progressBar = screen.getByRole('progressbar')

        expect(progressBar.closest('.glass-card')).toBeNull()
    })
})
