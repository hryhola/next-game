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
    }

    $Move(by: TicTacToe | TicTacToePlayer, data: { cell: [number, number] }) {
        if (by instanceof TicTacToe) {
            return
        }

        const [x, y] = data.cell

        this.state.board[x][y] = by.state.char

        const winnerChar = this.checkWin()

        if (winnerChar) {
            this.state.winner = (this.game as TicTacToe).players.find(p => p.state.char === winnerChar)
            this.game.endSession()
        }
    }

    data() {
        return this.state
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
}
