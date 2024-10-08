import { Game } from 'state/common/game/Game'
import { LobbyMember } from 'state/lobby/LobbyMember'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { TicTacToePlayer } from './TicTacToePlayer'
import { TicTacToeSession } from './TicTacToeSession'

export type WinningLine = [CellCoords, CellCoords, CellCoords]
export type MoveChar = 'x' | 'o'
export type CellValue = MoveChar | null
export type CellCoords = [number, number]
export type TicTacToeMove = {
    player: TicTacToePlayer
    cell: CellCoords
    value: MoveChar
}

export class TicTacToe extends Game {
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

    join(member: LobbyMember): GeneralSuccess | GeneralFailure {
        const existed = this.players.find(p => p.member === member)

        if (existed) {
            return {
                success: false,
                message: 'Already joined'
            }
        }

        if (this.players.length === this.requiredPlayersAmount) {
            return {
                success: false,
                message: 'Max players'
            }
        }

        const char = this.players[0]?.state.playerChar === 'o' ? 'x' : 'o'

        const player = new TicTacToePlayer(member, char)

        if (member.state.memberIsCreator) {
            player.update({ playerIsMaster: true })
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
