import type { LobbyRecordV2 } from '../../lobby/types'
import { createEmptyBoard, createIdleTicTacToeSession, findWinningLine, isBoardFull, startTicTacToeGame } from './logic'

function createRecord(): LobbyRecordV2 {
    return {
        chat: [],
        game: {
            config: {},
            kind: 'TicTacToe',
            participants: [
                {
                    memberId: 'player-1',
                    seat: 'x'
                },
                {
                    memberId: 'player-2',
                    seat: 'o'
                }
            ],
            session: createIdleTicTacToeSession()
        },
        lobby: {
            createdAt: '2026-03-31T12:00:00.000Z',
            creatorUserId: 'player-1',
            id: 'lobby-1',
            name: 'Test lobby',
            updatedAt: '2026-03-31T12:00:00.000Z'
        },
        members: [
            {
                id: 'player-1',
                isCreator: true,
                joinedAt: '2026-03-31T12:00:00.000Z',
                role: 'player',
                userColor: '#ffffff',
                userNickname: 'Player 1'
            },
            {
                id: 'player-2',
                isCreator: false,
                joinedAt: '2026-03-31T12:00:01.000Z',
                role: 'player',
                userColor: '#00ff00',
                userNickname: 'Player 2'
            }
        ],
        readyCheck: {
            participants: [],
            status: 'idle',
            updatedAt: '2026-03-31T12:00:00.000Z',
            votes: {}
        },
        version: 2
    }
}

describe('tictactoe lobby helpers', () => {
    it('creates an empty 3x3 board', () => {
        expect(createEmptyBoard()).toEqual([
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ])
    })

    it('detects a winning diagonal', () => {
        expect(
            findWinningLine([
                ['x', null, null],
                [null, 'x', null],
                [null, null, 'x']
            ])
        ).toEqual({
            line: [
                [0, 0],
                [1, 1],
                [2, 2]
            ],
            winner: 'x'
        })
    })

    it('detects a full board', () => {
        expect(
            isBoardFull([
                ['x', 'o', 'x'],
                ['o', 'x', 'o'],
                ['o', 'x', 'o']
            ])
        ).toBe(true)
    })

    it('starts without requiring a ready check', () => {
        const record = createRecord()

        const result = startTicTacToeGame(record, 'player-2')

        expect(result.success).toBe(true)
        expect(record.game.session.status).toBe('active')
        expect(record.game.session.turnUserId).toBe('player-1')
    })
})
