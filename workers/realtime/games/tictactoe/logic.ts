import type { TicTacToeCellCoords, TicTacToeCellValue } from '../../../../shared/contracts/realtime-lobby'
import type { FinalizeLobbySessionInput } from '../../lobby-sessions/store'
import type { LobbyMutationResult } from '../../lobby/operations'
import { resetReadyCheck } from '../../lobby/ready-check'
import { nowIso } from '../../lobby/time'
import type { LobbyRecordV2, StoredTicTacToeGameState } from '../../lobby/types'

export function createEmptyBoard(): TicTacToeCellValue[][] {
    return [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]
}

export function isBoardFull(board: TicTacToeCellValue[][]): boolean {
    return board.every(row => row.every(cell => cell !== null))
}

export function findWinningLine(board: TicTacToeCellValue[][]): { line: TicTacToeCellCoords[]; winner: 'x' | 'o' } | null {
    for (let row = 0; row < board.length; row += 1) {
        if (board[row][0] !== null && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
            return {
                winner: board[row][0] as 'x' | 'o',
                line: [
                    [row, 0],
                    [row, 1],
                    [row, 2]
                ]
            }
        }
    }

    for (let column = 0; column < board[0].length; column += 1) {
        if (board[0][column] !== null && board[0][column] === board[1][column] && board[1][column] === board[2][column]) {
            return {
                winner: board[0][column] as 'x' | 'o',
                line: [
                    [0, column],
                    [1, column],
                    [2, column]
                ]
            }
        }
    }

    if (board[0][0] !== null && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return {
            winner: board[0][0],
            line: [
                [0, 0],
                [1, 1],
                [2, 2]
            ]
        }
    }

    if (board[0][2] !== null && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return {
            winner: board[0][2],
            line: [
                [0, 2],
                [1, 1],
                [2, 0]
            ]
        }
    }

    return null
}

export function createIdleTicTacToeSession() {
    return {
        board: createEmptyBoard(),
        endedAt: null,
        id: null,
        isDraw: false,
        startedAt: null,
        status: 'idle' as const,
        turnUserId: null,
        winLine: null,
        winnerUserId: null
    }
}

function getGame(record: LobbyRecordV2): StoredTicTacToeGameState {
    return record.game as StoredTicTacToeGameState
}

function getPlayers(record: LobbyRecordV2) {
    return record.members.filter(member => member.role === 'player')
}

function getSeatByUserId(game: StoredTicTacToeGameState, userId: string) {
    return game.participants.find(participant => participant.memberId === userId)?.seat || null
}

export function startTicTacToeGame(record: LobbyRecordV2, userId: string): LobbyMutationResult {
    const game = getGame(record)

    if (game.kind !== 'TicTacToe') {
        return {
            success: false,
            message: 'This room does not run TicTacToe',
            code: 'invalid_game'
        }
    }

    if (!record.members.some(member => member.id === userId && member.role === 'player')) {
        return {
            success: false,
            message: 'Only players can start the game',
            code: 'not_a_player'
        }
    }

    const players = getPlayers(record)

    if (players.length !== 2) {
        return {
            success: false,
            message: 'TicTacToe requires exactly 2 players',
            code: 'invalid_player_count'
        }
    }

    if (!players.every(player => record.readyCheck.votes[player.id] === true)) {
        return {
            success: false,
            message: 'Run the ready check and wait for both players to confirm',
            code: 'players_not_ready'
        }
    }

    const orderedPlayers = [...players].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    const sessionId = crypto.randomUUID()
    const startedAt = nowIso()

    game.session = {
        board: createEmptyBoard(),
        endedAt: null,
        id: sessionId,
        isDraw: false,
        startedAt,
        status: 'active',
        turnUserId: orderedPlayers[0].id,
        winLine: null,
        winnerUserId: null
    }

    resetReadyCheck(record)

    return {
        success: true,
        startedSession: {
            gameName: game.kind,
            id: sessionId,
            initiatedByUserId: userId,
            startedAt
        },
        stateChanged: true
    }
}

export function makeTicTacToeMove(record: LobbyRecordV2, userId: string, cell: [number, number]): LobbyMutationResult {
    const game = getGame(record)

    if (game.kind !== 'TicTacToe') {
        return {
            success: false,
            message: 'This room does not run TicTacToe',
            code: 'invalid_game'
        }
    }

    const player = record.members.find(member => member.id === userId && member.role === 'player')

    if (!player) {
        return {
            success: false,
            message: 'Only players can make moves',
            code: 'not_a_player'
        }
    }

    if (game.session.status !== 'active') {
        return {
            success: false,
            message: 'There is no active game',
            code: 'game_not_started'
        }
    }

    if (game.session.turnUserId !== userId) {
        return {
            success: false,
            message: 'It is not your turn',
            code: 'not_your_turn'
        }
    }

    const [row, column] = cell

    if (row < 0 || row > 2 || column < 0 || column > 2) {
        return {
            success: false,
            message: 'Invalid board cell',
            code: 'invalid_cell'
        }
    }

    if (game.session.board[row][column] !== null) {
        return {
            success: false,
            message: 'Cell is already taken',
            code: 'cell_taken'
        }
    }

    const seat = getSeatByUserId(game, userId)

    if (!seat) {
        return {
            success: false,
            message: 'Player piece is missing',
            code: 'player_char_missing'
        }
    }

    game.session.board[row][column] = seat

    const winningLine = findWinningLine(game.session.board)

    if (winningLine) {
        const winner = game.participants.find(participant => participant.seat === winningLine.winner)

        game.session.status = 'finished'
        game.session.winnerUserId = winner?.memberId || null
        game.session.winLine = winningLine.line
        game.session.turnUserId = null
        game.session.endedAt = nowIso()
        game.session.isDraw = false

        return {
            finalizedSession: createCompletedTicTacToeLobbySessionRecord(record) || undefined,
            notifyLobbyList: true,
            stateChanged: true,
            success: true
        }
    }

    if (isBoardFull(game.session.board)) {
        game.session.status = 'finished'
        game.session.winnerUserId = null
        game.session.winLine = null
        game.session.turnUserId = null
        game.session.endedAt = nowIso()
        game.session.isDraw = true

        return {
            finalizedSession: createCompletedTicTacToeLobbySessionRecord(record) || undefined,
            notifyLobbyList: true,
            stateChanged: true,
            success: true
        }
    }

    const nextPlayer = game.participants.find(participant => participant.memberId !== userId)
    game.session.turnUserId = nextPlayer?.memberId || null

    return {
        stateChanged: true,
        success: true
    }
}

export function createCompletedTicTacToeLobbySessionRecord(record: LobbyRecordV2): FinalizeLobbySessionInput | null {
    const game = getGame(record)

    if (game.kind !== 'TicTacToe' || game.session.status !== 'finished' || !game.session.id) {
        return null
    }

    const session = game.session
    const sessionId = session.id
    const winner = record.members.find(member => member.id === session.winnerUserId)

    if (!sessionId) {
        return null
    }

    return {
        endedAt: session.endedAt || nowIso(),
        id: sessionId,
        resultSummary: {
            board: session.board.map(row => [...row]),
            isDraw: session.isDraw,
            players: game.participants
                .map(participant => {
                    const member = record.members.find(item => item.id === participant.memberId && item.role === 'player')

                    return member
                        ? {
                              id: member.id,
                              playerChar: participant.seat,
                              userNickname: member.userNickname
                          }
                        : null
                })
                .filter(Boolean),
            winLine: session.winLine ? [...session.winLine] : null
        },
        status: 'completed',
        winnerNickname: winner?.userNickname || null,
        winnerUserId: winner?.id || null
    }
}

export function createAbandonedTicTacToeLobbySessionRecord(record: LobbyRecordV2, reason: string): FinalizeLobbySessionInput | null {
    const game = getGame(record)

    if (game.kind !== 'TicTacToe' || game.session.status !== 'active' || !game.session.id) {
        return null
    }

    const sessionId = game.session.id

    if (!sessionId) {
        return null
    }

    return {
        endedAt: nowIso(),
        id: sessionId,
        resultSummary: {
            board: game.session.board.map(row => [...row]),
            players: game.participants
                .map(participant => {
                    const member = record.members.find(item => item.id === participant.memberId && item.role === 'player')

                    return member
                        ? {
                              id: member.id,
                              playerChar: participant.seat,
                              userNickname: member.userNickname
                          }
                        : null
                })
                .filter(Boolean),
            reason
        },
        status: 'abandoned'
    }
}
