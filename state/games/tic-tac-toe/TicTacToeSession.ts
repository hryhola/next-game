import { GameSession } from 'state/common/game/GameSession'
import { TicTacToe, CellValue, WinningLine, MoveChar } from './TicTacToe'
import { TicTacToePlayer } from './TicTacToePlayer'
import { TicTacToeSessionState } from './TicTacToeSessionState'
import { rotateMatrix } from '../../../util/matrix'

export class TicTacToeSession extends GameSession {
    state: TicTacToeSessionState

    constructor(game: TicTacToe) {
        super(game)

        this.state = new TicTacToeSessionState()
        this.state.turn = game.players[0]
    }

    $Move(by: TicTacToePlayer, data: { cell: [number, number] }) {
        if (by !== this.state.turn) {
            return {
                status: 'Error',
                message: 'Not your turn'
            }
        }

        const [x, y] = data.cell

        if (x > 2 || y > 2) {
            return {
                status: 'Error',
                message: 'Invalid cell'
            }
        }

        if (this.state.board[x][y]) {
            return {
                status: 'Error',
                message: 'Cell is already taken'
            }
        }

        this.state.board[x][y] = by.state.char

        const winCheck = this.findWinner(this.state.board)

        const players = this.game.players as TicTacToePlayer[]

        this.state.turn = winCheck.winner ? undefined : this.state.turn === players[0] ? players[1] : players[0]

        if (winCheck.winner) {
            this.state.winner = (this.game as TicTacToe).players.find(p => p.state.char === winCheck.winner)

            this.game.endSession()
        }

        const isDraw = !winCheck.winner && this.isBoardFull()

        if (isDraw) {
            this.game.endSession()
        }

        return {
            status: 'Success',
            nextTurn: this.state.turn?.data().id,
            winner: this.state.winner?.data().id,
            winLine: winCheck.line,
            isDraw
        }
    }

    data() {
        return {
            board: this.state.board,
            winner: this.state.winner?.data().id,
            turn: this.state.turn?.data().id
        }
    }

    findWinner(board: CellValue[][]): { winner: MoveChar; line: WinningLine } | { winner: null; line: null } {
        // check rows
        for (let i = 0; i < board.length; i++) {
            if (board[i][0] !== null && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
                return {
                    winner: board[i][0] as MoveChar,
                    line: [
                        [i, 0],
                        [i, 1],
                        [i, 2]
                    ]
                }
            }
        }

        // check columns
        for (let j = 0; j < board[0].length; j++) {
            if (board[0][j] !== null && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
                return {
                    winner: board[0][j] as MoveChar,
                    line: [
                        [0, j],
                        [1, j],
                        [2, j]
                    ]
                }
            }
        }

        // check diagonals
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

        return { winner: null, line: null }
    }

    isBoardFull() {
        return this.state.board.every(row => row.every(cell => cell !== null))
    }
}

export type TicTacToeSessionData = ReturnType<TicTacToeSession['data']>
