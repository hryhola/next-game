import type { TicTacToeCellCoords, TicTacToeCellValue } from '../../../shared/contracts/realtime-lobby'
import type { FinalizeRoomSessionInput } from '../room-sessions/store'
import type { StoredLobbyState } from './types'
import type { GameStartResult, TicTacToeMoveResult } from './operations'
import { nowIso, resetReadyCheck } from './common'

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

export function startTicTacToeGame(state: StoredLobbyState, userId: string): GameStartResult {
    if (state.game.name !== 'TicTacToe') {
        return {
            success: false,
            message: 'This room does not run TicTacToe',
            code: 'invalid_game'
        }
    }

    if (state.creatorUserId !== userId) {
        return {
            success: false,
            message: 'Only the lobby creator can start the game',
            code: 'forbidden'
        }
    }

    const players = state.members.filter(member => member.role === 'player')

    if (players.length !== 2) {
        return {
            success: false,
            message: 'TicTacToe requires exactly 2 players',
            code: 'invalid_player_count'
        }
    }

    if (!players.every(player => player.ready === true)) {
        return {
            success: false,
            message: 'Run the ready check and wait for both players to confirm',
            code: 'players_not_ready'
        }
    }

    const orderedPlayers = [...players].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    const sessionId = crypto.randomUUID()
    const startedAt = nowIso()

    state.game.session = {
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

    resetReadyCheck(state)

    return {
        success: true,
        startedSession: {
            gameName: state.game.name,
            id: sessionId,
            initiatedByUserId: userId,
            startedAt
        },
        stateChanged: true
    }
}

export function makeTicTacToeMove(state: StoredLobbyState, userId: string, cell: [number, number]): TicTacToeMoveResult {
    if (state.game.name !== 'TicTacToe') {
        return {
            success: false,
            message: 'This room does not run TicTacToe',
            code: 'invalid_game'
        }
    }

    const player = state.members.find(member => member.id === userId && member.role === 'player')

    if (!player) {
        return {
            success: false,
            message: 'Only players can make moves',
            code: 'not_a_player'
        }
    }

    if (state.game.session.status !== 'active') {
        return {
            success: false,
            message: 'There is no active game',
            code: 'game_not_started'
        }
    }

    if (state.game.session.turnUserId !== userId) {
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

    if (state.game.session.board[row][column] !== null) {
        return {
            success: false,
            message: 'Cell is already taken',
            code: 'cell_taken'
        }
    }

    if (!player.playerChar) {
        return {
            success: false,
            message: 'Player piece is missing',
            code: 'player_char_missing'
        }
    }

    state.game.session.board[row][column] = player.playerChar

    const winningLine = findWinningLine(state.game.session.board)

    if (winningLine) {
        const winner = state.members.find(member => member.playerChar === winningLine.winner)

        state.game.session.status = 'finished'
        state.game.session.winnerUserId = winner?.id || null
        state.game.session.winLine = winningLine.line
        state.game.session.turnUserId = null
        state.game.session.endedAt = nowIso()
        state.game.session.isDraw = false

        return {
            finalizedSession: createCompletedTicTacToeRoomSessionRecord(state) || undefined,
            success: true
        }
    }

    if (isBoardFull(state.game.session.board)) {
        state.game.session.status = 'finished'
        state.game.session.winnerUserId = null
        state.game.session.winLine = null
        state.game.session.turnUserId = null
        state.game.session.endedAt = nowIso()
        state.game.session.isDraw = true

        return {
            finalizedSession: createCompletedTicTacToeRoomSessionRecord(state) || undefined,
            success: true
        }
    }

    const nextPlayer = state.members.find(member => member.role === 'player' && member.id !== userId)
    state.game.session.turnUserId = nextPlayer?.id || null

    return {
        success: true
    }
}

export function createCompletedTicTacToeRoomSessionRecord(state: StoredLobbyState): FinalizeRoomSessionInput | null {
    if (state.game.name !== 'TicTacToe' || state.game.session.status !== 'finished' || !state.game.session.id) {
        return null
    }

    const session = state.game.session
    const sessionId = session.id
    const winner = state.members.find(member => member.id === session.winnerUserId)

    if (!sessionId) {
        return null
    }

    return {
        endedAt: session.endedAt || nowIso(),
        id: sessionId,
        resultSummary: {
            board: session.board.map(row => [...row]),
            isDraw: session.isDraw,
            players: state.members
                .filter(member => member.role === 'player')
                .map(member => ({
                    id: member.id,
                    playerChar: member.playerChar,
                    userNickname: member.userNickname
                })),
            winLine: session.winLine ? [...session.winLine] : null
        },
        status: 'completed',
        winnerNickname: winner?.userNickname || null,
        winnerUserId: winner?.id || null
    }
}

export function createAbandonedTicTacToeRoomSessionRecord(state: StoredLobbyState, reason: string): FinalizeRoomSessionInput | null {
    if (state.game.name !== 'TicTacToe' || state.game.session.status !== 'active' || !state.game.session.id) {
        return null
    }

    const sessionId = state.game.session.id

    if (!sessionId) {
        return null
    }

    return {
        endedAt: nowIso(),
        id: sessionId,
        resultSummary: {
            board: state.game.session.board.map(row => [...row]),
            players: state.members
                .filter(member => member.role === 'player')
                .map(member => ({
                    id: member.id,
                    playerChar: member.playerChar,
                    userNickname: member.userNickname
                })),
            reason
        },
        status: 'abandoned'
    }
}
