import { AbstractGame } from 'state/common/game/AbstractGame'
import { LobbyMember } from 'state/lobby/LobbyMember'
import { TicTacToePlayer } from './TicTacToePlayer'
import { TicTacToeSession } from './TicTacToeSession'

export type MoveChar = 'x' | 'o'
export type CellValue = MoveChar | null
export type TicTacToeMove = {
    player: TicTacToePlayer
    cell: [number, number]
    value: MoveChar
}

export class TicTacToe extends AbstractGame {
    static gameName = 'TicTacToe'

    requiredPlayersAmount = 2

    players: TicTacToePlayer[] = []

    currentSession?: TicTacToeSession

    startSession() {
        if (this.currentSession) {
            return {
                success: false,
                message: 'Session already in progress'
            }
        }

        if (this.players.length !== this.requiredPlayersAmount) {
            return {
                success: false,
                message: 'Not enough players'
            }
        }

        this.currentSession = new TicTacToeSession(this)

        this.publish('Game-SessionStart', {
            lobbyId: this.lobby.id,
            session: this.currentSession.data()
        })

        return {
            success: true,
            message: 'Session started'
        }
    }

    join(member: LobbyMember) {
        const existed = this.players.find(p => p.member === member)

        if (existed) {
            return {
                success: true,
                message: 'Already joined'
            }
        }

        if (this.players.length === this.requiredPlayersAmount) {
            return {
                success: false,
                message: 'Max players'
            }
        }

        const char = this.players[0]?.state.char === 'o' ? 'x' : 'o'

        const player = new TicTacToePlayer(member, char)

        if (member.state.isCreator) {
            player.update({ isMaster: true })
        }

        this.players.push(player)

        this.publish('Game-Join', {
            lobbyId: this.lobby.id,
            player: player.data()
        })

        return {
            success: true
        }
    }
}
