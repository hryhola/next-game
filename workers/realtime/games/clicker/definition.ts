import type { IdentityProfile } from '../../../../shared/contracts/identity'
import type { LobbyGameFeature } from '../../lobby/game-contract'
import {
    cancelClickerSessionTasks,
    createAbandonedClickerLobbySessionRecord,
    createIdleClickerSession,
    handleClickerAllowClickTask,
    handleClickerClick,
    handleClickerCompleteSessionTask,
    handleClickerReenablePlayerTask,
    startClickerGame
} from './logic'
import type { LobbyMutationResult } from '../../lobby/operations'
import type { LobbyRecordV2, StoredClickerGameState, StoredClickerParticipant } from '../../lobby/types'

function toParticipants(record: LobbyRecordV2): StoredClickerParticipant[] {
    const previousParticipants = new Map((record.game as StoredClickerGameState).participants.map(participant => [participant.memberId, participant]))

    return record.members
        .filter(member => member.role === 'player')
        .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
        .map(member => ({
            isClickAllowed: previousParticipants.get(member.id)?.isClickAllowed ?? true,
            memberId: member.id,
            score: previousParticipants.get(member.id)?.score ?? 0
        }))
}

function participantsChanged(previous: StoredClickerParticipant[], next: StoredClickerParticipant[]): boolean {
    return (
        previous.length !== next.length ||
        previous.some(
            (participant, index) =>
                participant.memberId !== next[index]?.memberId ||
                participant.isClickAllowed !== next[index]?.isClickAllowed ||
                participant.score !== next[index]?.score
        )
    )
}

export function createClickerGameFeature(): LobbyGameFeature<StoredClickerGameState> {
    return {
        kind: 'Clicker',
        create: (config: unknown, creator: IdentityProfile) => ({
            config: (config || {}) as StoredClickerGameState['config'],
            kind: 'Clicker',
            participants: [
                {
                    isClickAllowed: true,
                    memberId: creator.id,
                    score: 0
                }
            ],
            session: createIdleClickerSession()
        }),
        createSessionRecord: (record, reason) => {
            return reason ? createAbandonedClickerLobbySessionRecord(record, reason) : null
        },
        getLobbyStatus: record => ((record.game as StoredClickerGameState).session.status === 'idle' ? 'waiting' : 'in_progress'),
        getPolicy: record => ({
            getReadyCheckParticipantIds: () => toParticipants(record).map(participant => participant.memberId),
            isInProgress: currentRecord => (currentRecord.game as StoredClickerGameState).session.status !== 'idle',
            validateReadyCheck: () => {
                if (!toParticipants(record).length) {
                    return {
                        success: false as const,
                        message: 'Clicker requires at least 1 player',
                        code: 'invalid_player_count'
                    }
                }

                return null
            },
            validateRole: () => null
        }),
        project: record => {
            const game = record.game as StoredClickerGameState

            return {
                config: {
                    ...game.config
                },
                kind: 'Clicker' as const,
                name: 'Clicker' as const,
                participants: game.participants.map(participant => ({
                    ...participant
                })),
                session: {
                    ...game.session
                },
                status: game.session.status === 'idle' ? 'waiting' : 'in_progress'
            }
        },
        start: async (record, actorUserId, featureCtx) => startClickerGame(record, actorUserId, featureCtx),
        handleCommand: async (record, actorUserId, commandName, commandPayload, featureCtx) => {
            if (commandName !== '$Click') {
                return {
                    success: false,
                    message: `Unsupported Clicker command: ${commandName}`,
                    code: 'unsupported_command'
                }
            }

            const payload = commandPayload as { x?: number; y?: number } | null

            if (typeof payload?.x !== 'number' || typeof payload.y !== 'number') {
                return {
                    success: false,
                    message: 'Click coordinates are required',
                    code: 'invalid_payload'
                }
            }

            return handleClickerClick(record, actorUserId, payload.x, payload.y, featureCtx)
        },
        handleTask: async (record, task, featureCtx) => {
            const taskPayload = task.taskPayload || {}
            let result: LobbyMutationResult

            switch (task.taskName) {
                case 'clicker.allow-click':
                    result = handleClickerAllowClickTask(record, String(taskPayload.sessionId || ''), featureCtx)
                    break
                case 'clicker.reenable-player':
                    result = handleClickerReenablePlayerTask(record, String(taskPayload.sessionId || ''), String(taskPayload.userId || ''))
                    break
                case 'clicker.complete-session':
                    result = handleClickerCompleteSessionTask(record, String(taskPayload.sessionId || ''), String(taskPayload.winnerUserId || ''))
                    break
                default:
                    return {
                        stateChanged: false,
                        success: true
                    }
            }

            if (!result.success) {
                return result
            }

            return {
                ...result,
                notifyLobbyList: Boolean(result.finalizedSession),
                success: true
            }
        },
        onTip: async () => ({
            stateChanged: false,
            success: true
        }),
        onMembersChanged: async (record, reason, featureCtx) => {
            const game = record.game as StoredClickerGameState
            const nextParticipants = toParticipants(record)
            const didChangeParticipants = participantsChanged(game.participants, nextParticipants)

            game.participants = nextParticipants

            if (!didChangeParticipants || game.session.status === 'idle' || nextParticipants.length > 0) {
                return {
                    stateChanged: didChangeParticipants,
                    success: true
                }
            }

            const finalizedSession = createAbandonedClickerLobbySessionRecord(record, reason === 'member_kicked' ? 'all_players_kicked' : 'all_players_left')
            const sessionId = game.session.id

            game.session = createIdleClickerSession()

            if (sessionId) {
                await cancelClickerSessionTasks(featureCtx.scheduler, sessionId)
            }

            return {
                finalizedSession,
                notifyLobbyList: Boolean(finalizedSession),
                stateChanged: true,
                success: true
            }
        }
    }
}
