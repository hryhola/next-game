import { Clicker } from './clicker/Clicker'
import { TicTacToe } from './tic-tac-toe/TicTacToe'
import { Jeopardy } from './jeopardy/Jeopardy'

export const GameCtors = {
    Clicker,
    TicTacToe,
    Jeopardy
}

export type GameName = keyof typeof GameCtors
