import { createEmptyBoard, findWinningLine, isBoardFull } from './logic'

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
})
