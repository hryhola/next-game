import { Clicker } from './clicker/Clicker'
// import { TicTacToe } from './tic-tac-toe/TicTacToe'

export const GameCtors = {
    Clicker: Clicker
    // 'TicTacToe': TicTacToe,
}

export type GameName = keyof typeof GameCtors
