import type { IdentityProfile } from '../../../../shared/contracts/identity'
import type { LobbyGameFeature } from '../../lobby/game-contract'
import { createIdleTicTacToeSession, createAbandonedTicTacToeLobbySessionRecord, makeTicTacToeMove, startTicTacToeGame } from './logic'
import type { LobbyRecordV2, StoredTicTacToeGameState, StoredTicTacToeParticipant } from '../../lobby/types'

function toParticipants(record: LobbyRecordV2): StoredTicTacToeParticipant[] {
    return record.members
        .filter(member => member.role === 'player')
        .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
        .slice(0, 2)
        .map((member, index) => ({
            memberId: member.id,
            seat: index === 0 ? 'x' : 'o'
        }))
}

function participantsChanged(previous: StoredTicTacToeParticipant[], next: StoredTicTacToeParticipant[]): boolean {
    return (
        previous.length !== next.length ||
        previous.some((participant, index) => participant.memberId !== next[index]?.memberId || participant.seat !== next[index]?.seat)
    )
}

export function createTicTacToeGameFeature(): LobbyGameFeature<StoredTicTacToeGameState> {
    return {
        kind: 'TicTacToe',
        create: (_config: unknown, creator: IdentityProfile) => ({
            config: {},
            kind: 'TicTacToe',
            participants: [
                {
                    memberId: creator.id,
                    seat: 'x'
                }
            ],
            session: createIdleTicTacToeSession()
        }),
        createSessionRecord: (record, reason) => {
            if (!reason) {
                return null
            }

            return createAbandonedTicTacToeLobbySessionRecord(record, reason)
        },
        getLobbyStatus: record => ((record.game as StoredTicTacToeGameState).session.status === 'active' ? 'in_progress' : 'waiting'),
        getPolicy: record => ({
            getReadyCheckParticipantIds: () => toParticipants(record).map(participant => participant.memberId),
            isInProgress: currentRecord => (currentRecord.game as StoredTicTacToeGameState).session.status === 'active',
            validateReadyCheck: () => {
                if (toParticipants(record).length !== 2) {
                    return {
                        success: false as const,
                        message: 'TicTacToe requires exactly 2 players',
                        code: 'invalid_player_count'
                    }
                }

                return null
            },
            validateRole: (currentRecord, user, role) => {
                if (role !== 'player') {
                    return null
                }

                const playersCount = currentRecord.members.filter(member => member.role === 'player' && member.id !== user.id).length

                if (playersCount >= 2) {
                    return {
                        success: false as const,
                        message: 'Player slots are full',
                        code: 'player_slots_full'
                    }
                }

                return null
            }
        }),
        project: record => {
            const game = record.game as StoredTicTacToeGameState

            return {
                config: {},
                kind: 'TicTacToe' as const,
                name: 'TicTacToe' as const,
                participants: game.participants.map(participant => ({
                    ...participant
                })),
                session: {
                    ...game.session,
                    board: game.session.board.map(row => [...row]),
                    winLine: game.session.winLine ? [...game.session.winLine] : null
                },
                status: game.session.status === 'active' ? 'in_progress' : 'waiting'
            }
        },
        start: async (record, actorUserId) => startTicTacToeGame(record, actorUserId),
        handleCommand: async (record, actorUserId, commandName, commandPayload) => {
            if (commandName !== '$Move') {
                return {
                    success: false,
                    message: `Unsupported TicTacToe command: ${commandName}`,
                    code: 'unsupported_command'
                }
            }

            const payload = commandPayload as { cell?: [number, number] } | null

            if (!payload?.cell) {
                return {
                    success: false,
                    message: 'Move cell is required',
                    code: 'invalid_payload'
                }
            }

            return makeTicTacToeMove(record, actorUserId, payload.cell)
        },
        handleTask: async () => ({
            stateChanged: false,
            success: true
        }),
        onTip: async () => ({
            stateChanged: false,
            success: true
        }),
        onMembersChanged: async record => {
            const game = record.game as StoredTicTacToeGameState
            const nextParticipants = toParticipants(record)
            const didChangeParticipants = participantsChanged(game.participants, nextParticipants)

            game.participants = nextParticipants

            if (!didChangeParticipants || game.session.status !== 'active') {
                return {
                    stateChanged: didChangeParticipants,
                    success: true
                }
            }

            const finalizedSession = createAbandonedTicTacToeLobbySessionRecord(record, 'player_left')

            game.session = createIdleTicTacToeSession()

            return {
                finalizedSession,
                notifyLobbyList: Boolean(finalizedSession),
                stateChanged: true,
                success: true
            }
        }
    }
}
