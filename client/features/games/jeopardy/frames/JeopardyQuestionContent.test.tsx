/** @jest-environment jsdom */

import { screen } from '@testing-library/react'
import { createGameValue, createLobbyData, createPlayerData, createUserData, renderWithProviders } from 'client/test-utils/renderWithProviders'
import { QuestionContent } from './JeopardyQuestionContent'

const resources = {
    current: {
        Audio: {},
        Images: {},
        Video: {}
    }
}

function createQuestionFrame(overrides: Record<string, unknown> = {}) {
    return {
        answerGivingEndsAt: null,
        answerGivingStartedAt: null,
        answerGivingTimeLeft: null,
        answerRequestEndsAt: null,
        answerRequestStartedAt: null,
        answerRequestTimeLeft: null,
        answerVerifyingEndsAt: null,
        answerVerifyingStartedAt: null,
        answerVerifyingTimeLeft: null,
        answeringPlayerId: null,
        answeringStatus: 'too-early',
        content: 'Question text',
        contentPlacement: 'screen',
        elapsedMediaTimeMs: 0,
        eligiblePlayerIds: [],
        id: 'question-content',
        isRef: false,
        mediaStartedAt: null,
        phaseEndsAt: null,
        phaseStartedAt: null,
        phaseTimeLeft: null,
        playersOnCooldown: [],
        playersThatMadeBet: [],
        playersWhoAnswered: [],
        priceOptions: [500, 700, 900],
        questionId: '0-0-0',
        questionPrice: 700,
        questionTheme: 'Theme',
        questionType: 'secret',
        selectedPlayerId: null,
        skipVoted: [],
        specialPhase: undefined,
        type: 'text',
        ...overrides
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

describe('QuestionContent', () => {
    it('shows no progress bar during clue presentation before buzzing is allowed', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringStatus: 'too-early',
                    specialPhase: 'showing-question'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringStatus: 'too-early',
                            specialPhase: 'showing-question'
                        }),
                        internal: {},
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

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('shows a progress bar during the buzzer window for a normal question', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringStatus: 'allowed',
                    answerRequestTimeLeft: 60,
                    questionType: 'simple'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringStatus: 'allowed',
                            answerRequestTimeLeft: 60,
                            questionType: 'simple'
                        }),
                        internal: {},
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

        expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('shows a progress bar while the answering contestant is writing a normal answer', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringPlayerId: 'contestant-1',
                    answeringStatus: 'answering',
                    answerGivingTimeLeft: 40,
                    questionType: 'simple'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringPlayerId: 'contestant-1',
                            answeringStatus: 'answering',
                            answerGivingTimeLeft: 40,
                            questionType: 'simple'
                        }),
                        internal: {},
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

        expect(progressBar).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Confirm' }).closest('.glass-card')?.contains(progressBar)).toBe(true)
    })

    it('shows the player selection dock to the active chooser', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringPlayerId: 'contestant-1',
                    eligiblePlayerIds: ['contestant-2'],
                    specialPhase: 'selecting-player'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringPlayerId: 'contestant-1',
                            eligiblePlayerIds: ['contestant-2'],
                            specialPhase: 'selecting-player'
                        }),
                        internal: {},
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

        expect(screen.getByText('Choose Player')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Contestant 2' })).toBeInTheDocument()
    })

    it('shows the current question value in the value-selection dock for the chosen contestant', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringPlayerId: 'contestant-1',
                    selectedPlayerId: 'contestant-1',
                    specialPhase: 'choosing-price'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringPlayerId: 'contestant-1',
                            selectedPlayerId: 'contestant-1',
                            specialPhase: 'choosing-price'
                        }),
                        internal: {},
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

        expect(screen.getByText('Question Value')).toBeInTheDocument()
        expect(screen.getByText('700')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    })

    it('shows the answer dock only to the contestant who is currently answering', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringPlayerId: 'contestant-1',
                    answeringStatus: 'answering'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringPlayerId: 'contestant-1',
                            answeringStatus: 'answering'
                        }),
                        internal: {},
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

        expect(screen.getByText('Your Answer')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    })

    it('shows the verification dock to the Jeopardy master with the submitted answer details', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answerVerifyingTimeLeft: 80,
                    answeringStatus: 'answer-verifying',
                    specialPhase: 'question-verifying'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answerVerifyingTimeLeft: 80,
                            answeringStatus: 'answer-verifying',
                            specialPhase: 'question-verifying'
                        }),
                        internal: {
                            correctAnswers: ['Correct'],
                            currentAnsweringPlayerAnswerText: 'Submitted answer',
                            currentAnsweringPlayerId: 'contestant-1',
                            currentQuestionAnswers: {
                                'contestant-1': {
                                    value: 'Submitted answer',
                                    wager: 700
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

        expect(screen.getByText('Verify Answer')).toBeInTheDocument()
        expect(screen.getByText('Answer: Submitted answer')).toBeInTheDocument()
        const progressBar = screen.getByRole('progressbar')

        expect(progressBar).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Approve' }).closest('.glass-card')?.contains(progressBar)).toBe(true)
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    })

    it('shows the answer timer at the bottom of the screen for viewers who are not answering', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringPlayerId: 'contestant-1',
                    answeringStatus: 'answering',
                    answerGivingTimeLeft: 40,
                    questionType: 'simple'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answeringPlayerId: 'contestant-1',
                            answeringStatus: 'answering',
                            answerGivingTimeLeft: 40,
                            questionType: 'simple'
                        }),
                        internal: {},
                        isPaused: false
                    }
                }),
                lobby: createLobbyData({
                    id: 'lobby-1',
                    members: players
                }),
                user: createUserData({
                    id: 'contestant-2',
                    userNickname: 'Contestant 2'
                })
            }
        )

        const progressBar = screen.getByRole('progressbar')

        expect(progressBar).toBeInTheDocument()
        expect(progressBar.closest('.glass-card')).toBeNull()
    })

    it('shows the verification timer at the bottom of the screen for non-master viewers', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answerVerifyingTimeLeft: 80,
                    answeringStatus: 'answer-verifying',
                    specialPhase: 'question-verifying'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            answerVerifyingTimeLeft: 80,
                            answeringStatus: 'answer-verifying',
                            specialPhase: 'question-verifying'
                        }),
                        internal: {
                            correctAnswers: ['Correct'],
                            currentAnsweringPlayerAnswerText: 'Submitted answer',
                            currentAnsweringPlayerId: 'contestant-1',
                            currentQuestionAnswers: {
                                'contestant-1': {
                                    value: 'Submitted answer',
                                    wager: 700
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
                    id: 'contestant-2',
                    userNickname: 'Contestant 2'
                })
            }
        )

        const progressBar = screen.getByRole('progressbar')

        expect(progressBar).toBeInTheDocument()
        expect(progressBar.closest('.glass-card')).toBeNull()
    })
})
