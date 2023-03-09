import { CellValue, TicTacToeMove } from './TicTacToe'
import { TicTacToePlayer } from './TicTacToePlayer'

export class TicTacToeSessionState {
    board: CellValue[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]
    winner?: TicTacToePlayer
    turn?: TicTacToePlayer
}
