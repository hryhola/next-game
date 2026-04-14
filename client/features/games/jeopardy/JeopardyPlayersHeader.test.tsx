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
        act(() => {
            jest.runOnlyPendingTimers()
        })
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

        expect(getPlayerContainer('Contestant 1')).toHaveAttribute('data-highlight-tone', 'cyan')
        expect(getPlayerContainer('Contestant 2')).not.toHaveAttribute('data-highlight-tone')
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

        expect(getPlayerContainer('Contestant 2')).toHaveAttribute('data-highlight-tone', 'cyan')

        act(() => {
            jest.advanceTimersByTime(500)
        })

        expect(getPlayerContainer('Contestant 2')).not.toHaveAttribute('data-highlight-tone')
    })

    it('shows the active answering contestant in green for the whole answering window', () => {
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
                        answerGivingEndsAt: null,
                        answerGivingStartedAt: null,
                        answerGivingTimeLeft: 40,
                        answerRequestEndsAt: null,
                        answerRequestStartedAt: null,
                        answerRequestTimeLeft: null,
                        answerVerifyingEndsAt: null,
                        answerVerifyingStartedAt: null,
                        answerVerifyingTimeLeft: null,
                        answeringPlayerId: 'contestant-2',
                        answeringStatus: 'answering',
                        content: 'Question',
                        id: 'question-content',
                        playersOnCooldown: [],
                        playersWhoAnswered: ['contestant-2'],
                        questionId: '0-0-0',
                        skipVoted: [],
                        type: 'text'
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

        expect(getPlayerContainer('Contestant 2')).toHaveAttribute('data-highlight-tone', 'green')
    })

    it('shows contestants who voted to skip the current atom in white', () => {
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
                        content: 'Question',
                        id: 'question-content',
                        playersOnCooldown: [],
                        playersWhoAnswered: [],
                        questionId: '0-0-0',
                        skipVoted: ['contestant-2'],
                        specialPhase: 'showing-question',
                        type: 'text'
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

        expect(getPlayerContainer('Contestant 2')).toHaveAttribute('data-highlight-tone', 'white')
    })

    it('keeps unanimously skipped players highlighted in white on the next atom even after skipVoted resets', () => {
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
                        content: 'Next atom',
                        id: 'question-content',
                        playersOnCooldown: [],
                        playersWhoAnswered: [],
                        questionId: '0-0-0',
                        recentSkipVoters: ['contestant-1', 'contestant-2'],
                        skipVoted: [],
                        specialPhase: 'showing-question',
                        type: 'text'
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

        expect(getPlayerContainer('Contestant 1')).toHaveAttribute('data-highlight-tone', 'white')
        expect(getPlayerContainer('Contestant 2')).toHaveAttribute('data-highlight-tone', 'white')
    })

    it('keeps the skip-vote white highlight visible during later answering phases until the frame changes', () => {
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
                        answerGivingEndsAt: null,
                        answerGivingStartedAt: null,
                        answerGivingTimeLeft: 40,
                        answerRequestEndsAt: null,
                        answerRequestStartedAt: null,
                        answerRequestTimeLeft: null,
                        answerVerifyingEndsAt: null,
                        answerVerifyingStartedAt: null,
                        answerVerifyingTimeLeft: null,
                        answeringPlayerId: 'contestant-1',
                        answeringStatus: 'answering',
                        content: 'Question',
                        id: 'question-content',
                        playersOnCooldown: [],
                        playersWhoAnswered: ['contestant-1'],
                        questionId: '0-0-0',
                        skipVoted: ['contestant-2'],
                        specialPhase: undefined,
                        type: 'text'
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

        expect(getPlayerContainer('Contestant 2')).toHaveAttribute('data-highlight-tone', 'white')
        expect(getPlayerContainer('Contestant 1')).toHaveAttribute('data-highlight-tone', 'green')
    })

    it('briefly flashes the rated contestant blue on approval and red on decline', () => {
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
                    id: 'master',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                payload: {
                    rating: 'approved'
                },
                result: {
                    answeringPlayerId: 'contestant-1',
                    rating: 'approved',
                    success: true
                },
                type: '$RateAnswer'
            })
        })

        expect(getPlayerContainer('Contestant 1')).toHaveAttribute('data-highlight-tone', 'blue')

        act(() => {
            jest.advanceTimersByTime(900)
            ws.emit('Game-SessionAction', {
                actor: {
                    id: 'master',
                    type: 'player'
                },
                lobbyId: 'lobby-1',
                payload: {
                    rating: 'declined'
                },
                result: {
                    answeringPlayerId: 'contestant-1',
                    rating: 'declined',
                    success: true
                },
                type: '$RateAnswer'
            })
        })

        expect(getPlayerContainer('Contestant 1')).toHaveAttribute('data-highlight-tone', 'red')
    })
})
