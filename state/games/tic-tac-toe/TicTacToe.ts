import { rotateMatrix } from 'util/matrix'
import { Lobby, LobbyMember, TUser, User } from 'state'
import { AbstractGame, AbstractGameSession, AbstractPlayer } from '../AbstractGame'

type MoveChar = 'x' | 'o'
type CellValue = MoveChar | null
type TicTacToeMove = {
    player: TicTacToePlayer
    cell: [number, number]
    value: MoveChar
}

export class TicTacToePlayer extends AbstractPlayer {
    char: MoveChar

    constructor(lobby: Lobby, member: LobbyMember, char: MoveChar) {
        super(lobby, member.user)

        this.char = char
    }

    toJSON() {
        return {
            ...super.toJSON(),
            char: this.char
        }
    }
}

export type TTicTacToePlayer = Omit<TicTacToePlayer, 'user'> & {
    user: TUser
}

class TicTacToeState {
    board: CellValue[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]
    maxPlayers = 2
    moves: TicTacToeMove[] = []
    winner?: TicTacToePlayer
}

class TicTacToeSession extends AbstractGameSession {
    game!: TicTacToe
    state = new TicTacToeState()

    Move(data: { playerNickname: string; cell: [number, number] }) {
        const [x, y] = data.cell

        const player = this.game.players.find(p => p.user.nickname === data.playerNickname)!

        this.state.board[x][y] = player.char

        const winnerChar = this.checkWin()

        if (winnerChar) {
            this.state.winner = this.game.players.find(p => p.char === winnerChar)
            this.game.endSession()
        }
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

export class TicTacToe extends AbstractGame {
    static gameName = 'TicTacToe'

    maxPlayers = 2
    players: TicTacToePlayer[] = []

    startSession(): void {
        this.currentSession = new TicTacToeSession(this)
    }

    publish(ctx: string, data: any) {
        this.lobby.publish({
            ctx: `TicTacToe-${ctx}`,
            data
        })
    }

    join(member: LobbyMember) {
        const existed = this.players.find(p => p.user.nickname === member.user.nickname)

        if (existed) {
            return {
                success: true,
                players: this.players,
                message: 'Already joined'
            }
        }

        if (this.players.length === this.maxPlayers) {
            return {
                success: false,
                players: this.players,
                message: 'Max players'
            }
        }

        const char = this.players[0]?.char === 'o' ? 'x' : 'o'

        const player = new TicTacToePlayer(this.lobby, member, char)

        this.players.push(player)

        this.lobby.publish({
            ctx: 'TicTacToe-Join',
            data: {
                player: player.toJSON()
            }
        })

        return {
            success: true,
            players: this.players
        }
    }

    onPlayerOffline(player: TicTacToePlayer): void {
        this.publish('PlayerOffline', {
            player: player.toJSON()
        })
    }

    toJSON() {
        return {
            name: TicTacToe.gameName,
            state: this.currentSession?.state,
            players: this.players.map(p => ({
                user: p.user,
                char: p.char
            }))
        }
    }
}
