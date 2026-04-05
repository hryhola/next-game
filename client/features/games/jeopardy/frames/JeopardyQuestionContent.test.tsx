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
    it('renders text atoms inside a dedicated card and scales typography by content length', () => {
        const players = createPlayers()
        const shortView = renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    content: 'Who is this?',
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
                            content: 'Who is this?',
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

        expect(screen.getByTestId('jeopardy-text-card')).toBeInTheDocument()
        expect(screen.getByText('Who is this?')).toHaveAttribute('data-font-tier', 'short')

        shortView.unmount()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    content:
                        'This is a deliberately long Jeopardy clue that keeps going so the component has to reduce the font size instead of rendering the text with the same huge typography as a very short prompt.',
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
                            content:
                                'This is a deliberately long Jeopardy clue that keeps going so the component has to reduce the font size instead of rendering the text with the same huge typography as a very short prompt.',
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

        expect(screen.getByText(/deliberately long Jeopardy clue/)).toHaveAttribute('data-font-tier', 'medium')
    })

    it('renders image atoms inside a media card and lets the user toggle fullscreen mode', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    content: '/assets/test-question.jpg',
                    questionType: 'simple',
                    type: 'image'
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
                            content: '/assets/test-question.jpg',
                            questionType: 'simple',
                            type: 'image'
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

        const mediaShell = screen.getByTestId('jeopardy-media-shell')
        const mediaCard = screen.getByTestId('jeopardy-media-card')
        const fullscreenButton = screen.getByRole('button', { name: 'Fullscreen' })

        expect(mediaShell).toHaveAttribute('data-expanded', 'false')
        expect(fullscreenButton).toBeInTheDocument()
        expect(mediaCard.contains(fullscreenButton)).toBe(false)

        fireEvent.click(fullscreenButton)

        expect(mediaShell).toHaveAttribute('data-expanded', 'true')
        expect(screen.getByRole('dialog', { name: 'Question image' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Back to Card' })).toBeInTheDocument()
        expect(mediaCard).toHaveStyle({
            height: 'calc(var(--fullHeight, 100vh) - 7rem)',
            width: 'calc(100vw - 2rem)'
        })
    })

    it('moves the fullscreen collapse control to the top when the answer dock is visible and closes on Escape', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringPlayerId: 'contestant-1',
                    answeringStatus: 'answering',
                    content: '/assets/test-question.jpg',
                    questionType: 'simple',
                    type: 'image'
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
                            content: '/assets/test-question.jpg',
                            questionType: 'simple',
                            type: 'image'
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

        fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }))

        expect(screen.getByTestId('jeopardy-media-controls')).toHaveAttribute('data-placement', 'top')
        expect(screen.getByRole('button', { name: 'Back to Card' })).toBeInTheDocument()

        fireEvent.keyDown(window, { key: 'Escape' })

        expect(screen.getByTestId('jeopardy-media-shell')).toHaveAttribute('data-expanded', 'false')
        expect(screen.queryByRole('dialog', { name: 'Question image' })).not.toBeInTheDocument()
    })

    it('renders audio atoms inside an audio card with the animated indicator', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    content: '/assets/test-question.mp3',
                    questionType: 'simple',
                    type: 'voice'
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
                            content: '/assets/test-question.mp3',
                            questionType: 'simple',
                            type: 'voice'
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

        const audioCard = screen.getByTestId('jeopardy-audio-card')
        const audioElement = audioCard.querySelector('audio')

        expect(audioCard).toContainElement(screen.getByAltText('Audio question'))
        expect(audioElement).not.toBeNull()
        expect(audioElement).not.toHaveAttribute('controls')
    })

    it('applies the current lobby volume to media that appears after the clue rerenders', () => {
        const players = createPlayers()
        const audio = createAudioHarness({
            volume: 35
        })
        const { rerender } = renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    content: 'Question text',
                    questionType: 'simple',
                    type: 'text'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />,
            {
                audio,
                game: createGameValue({
                    players,
                    session: {
                        frame: createQuestionFrame({
                            content: 'Question text',
                            questionType: 'simple',
                            type: 'text'
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

        rerender(
            <QuestionContent
                {...(createQuestionFrame({
                    content: '/assets/test-question.mp3',
                    questionType: 'simple',
                    type: 'voice'
                }) as any)}
                Resources={resources as never}
                packFetchingTimeMs={0}
                useMediaTimestamp={false}
            />
        )

        const audioElement = screen.getByTestId('jeopardy-audio-card').querySelector('audio') as HTMLAudioElement

        expect(audioElement.volume).toBeCloseTo(0.35)
    })

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

    it('keeps the buzzer progress alive when the client wall clock is skewed but the worker fallback progress is valid', () => {
        const players = createPlayers()
        const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-03T19:17:28.603Z').getTime())
        const performanceNowSpy = jest.spyOn(performance, 'now').mockReturnValue(100)

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answerRequestEndsAt: '2026-04-03T19:17:17.603Z',
                    answerRequestStartedAt: '2026-04-03T19:17:12.603Z',
                    answerRequestTimeLeft: 80,
                    answeringStatus: 'allowed',
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
                            answerRequestEndsAt: '2026-04-03T19:17:17.603Z',
                            answerRequestStartedAt: '2026-04-03T19:17:12.603Z',
                            answerRequestTimeLeft: 80,
                            answeringStatus: 'allowed',
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

        expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(80, 1)

        warningSpy.mockRestore()
        dateNowSpy.mockRestore()
        performanceNowSpy.mockRestore()
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

    it('shows a compact answer guide to the Jeopardy master during question presentation', () => {
        const players = createPlayers()

        renderWithProviders(
            <QuestionContent
                {...(createQuestionFrame({
                    answeringStatus: 'allowed',
                    answerRequestTimeLeft: 60,
                    questionType: 'simple',
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
                            answeringStatus: 'allowed',
                            answerRequestTimeLeft: 60,
                            questionType: 'simple',
                            specialPhase: 'showing-question'
                        }),
                        internal: {
                            correctAnswers: ['Right answer'],
                            incorrectAnswers: ['Wrong answer']
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

        const widget = screen.getByText('Answer Guide').closest('.jeopardy-floating-widget')

        expect(widget).toHaveStyle({
            top: 'calc(var(--playersHeaderHeight, 0px) + 16px + var(--lobbyControlsRightHeight, 0px) + 12px)'
        })
        expect(screen.getByText('Answer Guide')).toBeInTheDocument()
        expect(screen.getByText('Right answer')).toBeInTheDocument()
        expect(screen.getByText('Wrong answer')).toBeInTheDocument()
        expect(screen.queryByText('Verify Answer')).not.toBeInTheDocument()
    })

    it('hides the compact answer guide when the verification dock is active', () => {
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
        expect(screen.queryByText('Answer Guide')).not.toBeInTheDocument()
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
