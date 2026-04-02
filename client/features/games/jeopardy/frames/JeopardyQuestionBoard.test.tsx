/** @jest-environment jsdom */

import { fireEvent, screen } from '@testing-library/react'
import { createGameValue, createLobbyData, createPlayerData, createUserData, createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'
import type { RealtimeJeopardyState } from 'shared/contracts/jeopardy'
import { QuestionBoard } from './JeopardyQuestionBoard'

function createBoardFrame(overrides: Partial<RealtimeJeopardyState.QuestionBoardFrame> = {}): RealtimeJeopardyState.QuestionBoardFrame {
    return {
        id: 'question-board',
        pickerId: 'contestant-1',
        roundId: 0,
        themes: [
            {
                name: 'Theme 1',
                question: [
                    {
                        isAnswered: false,
                        price: '100',
                        questionId: '0-0-0'
                    }
                ],
                themeId: '0-0'
            },
            {
                name: 'Theme 2',
                question: [
                    {
                        isAnswered: false,
                        price: '200',
                        questionId: '0-1-0'
                    }
                ],
                themeId: '0-1'
            }
        ],
        ...overrides
    }
}

describe('QuestionBoard', () => {
    it('shows category skip buttons to the Jeopardy master and sends the skip action', () => {
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
        const ws = createWSHarness()
        const frame = createBoardFrame()

        renderWithProviders(<QuestionBoard {...frame} />, {
            game: createGameValue({
                players,
                session: {
                    frame,
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

        fireEvent.click(screen.getByRole('button', { name: 'Skip Theme 1' }))

        expect(ws.send).toHaveBeenCalledWith('Game-SendAction', {
            actionName: '$SkipCategory',
            actionPayload: {
                themeId: '0-0'
            },
            lobbyId: 'lobby-1'
        })
    })

    it('hides category skip buttons from non-master viewers', () => {
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
        const frame = createBoardFrame()

        renderWithProviders(<QuestionBoard {...frame} />, {
            game: createGameValue({
                players,
                session: {
                    frame,
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

        expect(screen.queryByRole('button', { name: 'Skip Theme 1' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Skip Theme 2' })).not.toBeInTheDocument()
    })

    it('disables category skip buttons while a question is already being opened', () => {
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
        const frame = createBoardFrame({
            pickedQuestion: '0-1-0'
        })

        renderWithProviders(<QuestionBoard {...frame} />, {
            game: createGameValue({
                players,
                session: {
                    frame,
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

        expect(screen.getByRole('button', { name: 'Skip Theme 1' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Skip Theme 2' })).toBeDisabled()
    })
})
