import { Player } from 'state/common/game/Player'
import { LobbyMember } from 'state/lobby/LobbyMember'
import { MoveChar } from './TicTacToe'

interface TicTacToePlayerState {
    playerChar: MoveChar
}

export class TicTacToePlayer extends Player<TicTacToePlayerState> {
    constructor(member: LobbyMember, playerChar: MoveChar) {
        super(member)

        Object.assign(this.state, {
            playerChar
        } as TicTacToePlayerState)
    }
}

export type TicTacToePlayerData = ReturnType<TicTacToePlayer['data']>
