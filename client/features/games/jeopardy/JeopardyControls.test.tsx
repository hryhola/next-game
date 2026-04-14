/** @jest-environment jsdom */

import { screen } from '@testing-library/react'
import { createGameValue, createLobbyData, createPlayerData, createUserData, renderWithProviders } from 'client/test-utils/renderWithProviders'
import JeopardyControls from './JeopardyControls'

jest.mock('client/route/ClientRouter', () => ({
    useClientRouter: () => ({
        frame: 'Lobby',
        push: jest.fn(),
        refresh: jest.fn(),
        replace: jest.fn(),
        setFrame: jest.fn()
    })
}))

function createQuestionSession(frameOverrides: Record<string, unknown>) {
    return {
        frame: {
            id: 'question-content',
            playersOnCooldown: [],
            recentSkipVoters: [],
            skipVoted: [],
            playersWhoAnswered: [],
            answeringPlayerId: null,
            answeringStatus: 'too-early',
            questionType: 'simple',
            specialPhase: 'showing-question',
            ...frameOverrides
        },
        isPaused: false
    }
}

describe('JeopardyControls', () => {
    it('enables THE BUTTON during the early-buzz window for regular buzzer questions', () => {
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

        renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({})
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'THE BUTTON' }).every(button => !button.hasAttribute('disabled'))).toBe(true)
    })

    it('disables THE BUTTON when the contestant is on cooldown or the question is not a buzzer flow', () => {
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

        const firstRender = renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    playersOnCooldown: ['contestant-1']
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'THE BUTTON' }).every(button => button.hasAttribute('disabled'))).toBe(true)

        firstRender.unmount()

        renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    answeringStatus: 'answering',
                    questionType: 'secret',
                    specialPhase: undefined
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'THE BUTTON' }).every(button => button.hasAttribute('disabled'))).toBe(true)
    })

    it('shows skip and pause controls to the Jeopardy master during a live question', () => {
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

        renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    answeringStatus: 'allowed',
                    specialPhase: undefined
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'master',
                userNickname: 'Master'
            })
        })

        expect(screen.getAllByRole('button', { name: 'Skip' }).every(button => !button.hasAttribute('disabled'))).toBe(true)
        expect(screen.getAllByRole('button', { name: 'Pause' }).every(button => !button.hasAttribute('disabled'))).toBe(true)
    })

    it('keeps the player skip-vote button mounted and toggles its disabled state by phase', () => {
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

        const atomRender = renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    specialPhase: 'showing-question'
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'Skip' }).every(button => !button.hasAttribute('disabled'))).toBe(true)

        atomRender.unmount()

        const votedRender = renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    skipVoted: ['contestant-1'],
                    specialPhase: 'showing-answer'
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'Skip' }).every(button => button.hasAttribute('disabled'))).toBe(true)

        votedRender.unmount()

        const carriedHighlightRender = renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    recentSkipVoters: ['contestant-1', 'contestant-2'],
                    specialPhase: 'showing-answer'
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'Skip' }).every(button => !button.hasAttribute('disabled'))).toBe(true)

        carriedHighlightRender.unmount()

        renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: createQuestionSession({
                    answeringStatus: 'allowed',
                    specialPhase: undefined
                })
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByRole('button', { name: 'Skip' }).every(button => button.hasAttribute('disabled'))).toBe(true)
    })

    it('shows a pause label and freezes gameplay controls while the session is paused', () => {
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

        const pausedSession = {
            ...createQuestionSession({
                answeringStatus: 'allowed',
                specialPhase: undefined
            }),
            isPaused: true
        }

        const playerRender = renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: pausedSession
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'contestant-1',
                userNickname: 'Contestant 1'
            })
        })

        expect(screen.getAllByText('Pause').length).toBeGreaterThan(0)
        expect(screen.getAllByRole('button', { name: 'THE BUTTON' }).every(button => button.hasAttribute('disabled'))).toBe(true)

        playerRender.unmount()

        renderWithProviders(<JeopardyControls />, {
            game: createGameValue({
                players,
                session: pausedSession
            }),
            lobby: createLobbyData({
                members: players,
                id: 'lobby-1'
            }),
            user: createUserData({
                id: 'master',
                userNickname: 'Master'
            })
        })

        expect(screen.getAllByText('Pause').length).toBeGreaterThan(0)
        expect(screen.getAllByRole('button', { name: 'Resume' }).every(button => !button.hasAttribute('disabled'))).toBe(true)
        expect(screen.getAllByRole('button', { name: 'Skip' }).every(button => button.hasAttribute('disabled'))).toBe(true)
    })
})
