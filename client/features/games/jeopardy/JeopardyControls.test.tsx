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
})
