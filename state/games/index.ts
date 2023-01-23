import { Lobby, LobbyMember, User } from 'state'

// @index('./*/*.ts', f => `import { ${f.name} } from '${f.path}'`)
import { TicTacToe } from './tic-tac-toe/TicTacToe'
// @endindex

export const GameCtors = {
    // @index('./*/*.ts', f => `'${f.name}': ${f.name},`)
    TicTacToe: TicTacToe
    // @endindex
}

export type GameName = keyof typeof GameCtors
