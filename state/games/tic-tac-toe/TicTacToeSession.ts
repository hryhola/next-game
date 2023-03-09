import { AbstractGameSession } from 'state/common/game/AbstractGameSession'
import { TicTacToe, CellValue } from './TicTacToe'
import { TicTacToePlayer } from './TicTacToePlayer'
import { TicTacToeSessionState } from './TicTacToeSessionState'
import { rotateMatrix } from '../../../util/matrix'

export class TicTacToeSession extends AbstractGameSession {
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

        const winnerChar = this.checkWin()

        const players = this.game.players as TicTacToePlayer[]

        this.state.turn = winnerChar ? undefined : this.state.turn === players[0] ? players[1] : players[0]

        if (winnerChar) {
            this.state.winner = (this.game as TicTacToe).players.find(p => p.state.char === winnerChar)

            this.game.endSession()
        }

        const isDraw = this.isBoardFull()

        if (isDraw) {
            this.game.endSession()
        }

        return {
            status: 'Success',
            nextTurn: this.state.turn?.data().id,
            winner: this.state.winner?.data().id,
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

    isWinRow(row: CellValue[]) {
        return row.every(cell => cell === 'x') || row.every(cell => cell === 'o')
    }

    checkWin(): CellValue | false {
        const winRow = this.state.board.find(row => this.isWinRow(row))

        if (winRow) {
            return winRow[0]!
        }

        const winColumn = rotateMatrix(this.state.board).find((row: CellValue[]) => this.isWinRow(row))

        if (winColumn) {
            return winColumn[0]!
        }

        return false

        // todo directional win
    }

    isBoardFull() {
        return this.state.board.every(row => row.every(cell => cell !== null))
    }
}

export type TicTacToeSessionData = ReturnType<TicTacToeSession['data']>
