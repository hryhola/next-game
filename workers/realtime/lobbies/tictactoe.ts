import type { TicTacToeCellCoords, TicTacToeCellValue } from '../../../shared/contracts/realtime-lobby'

export function createEmptyBoard(): TicTacToeCellValue[][] {
    return [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]
}

export function isBoardFull(board: TicTacToeCellValue[][]): boolean {
    return board.every(row => row.every(cell => cell !== null))
}

export function findWinningLine(board: TicTacToeCellValue[][]): { line: TicTacToeCellCoords[]; winner: 'x' | 'o' } | null {
    for (let row = 0; row < board.length; row += 1) {
        if (board[row][0] !== null && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
            return {
                winner: board[row][0] as 'x' | 'o',
                line: [
                    [row, 0],
                    [row, 1],
                    [row, 2]
                ]
            }
        }
    }

    for (let column = 0; column < board[0].length; column += 1) {
        if (board[0][column] !== null && board[0][column] === board[1][column] && board[1][column] === board[2][column]) {
            return {
                winner: board[0][column] as 'x' | 'o',
                line: [
                    [0, column],
                    [1, column],
                    [2, column]
                ]
            }
        }
    }

    if (board[0][0] !== null && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return {
            winner: board[0][0],
            line: [
                [0, 0],
                [1, 1],
                [2, 2]
            ]
        }
    }

    if (board[0][2] !== null && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return {
            winner: board[0][2],
            line: [
                [0, 2],
                [1, 1],
                [2, 0]
            ]
        }
    }

    return null
}
