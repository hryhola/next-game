import { Clicker } from './clicker/Clicker'
import { TicTacToe } from './tic-tac-toe/TicTacToe'

export const GameCtors = {
    Clicker,
    TicTacToe
}

export type GameName = keyof typeof GameCtors
