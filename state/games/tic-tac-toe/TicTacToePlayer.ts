import { AbstractPlayer } from 'state/common/game/AbstractPlayer'
import { LobbyMember } from 'state/lobby/LobbyMember'
import { MoveChar } from './TicTacToe'

export class TicTacToePlayer extends AbstractPlayer {
    state: {
        score: number
        isMaster: boolean
        char: MoveChar
    }

    constructor(member: LobbyMember, char: MoveChar) {
        super(member)

        this.state = {
            score: 0,
            isMaster: false,
            char
        }
    }

    update(newState: Partial<typeof this.state>) {
        super.update(newState)
    }

    data() {
        return {
            ...this.member.data(),
            ...this.state
        }
    }
}

export type TicTacToePlayerData = ReturnType<TicTacToePlayer['data']>
