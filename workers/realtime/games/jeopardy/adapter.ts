import type { LobbyGameActionMessage } from '../../../../shared/contracts/realtime-lobby'
import type { FinalizeLobbySessionInput } from '../../lobby-sessions/store'
import type { LobbyGameContext } from '../../lobby/game-contract'
import type { LobbyMutationSuccess } from '../../lobby/operations'
import type { LobbyRecordV2, LobbyScheduledTaskPayload as CurrentLobbyScheduledTaskPayload, StoredJeopardyGameState } from '../../lobby/types'
import type { LobbyScheduler } from '../../scheduler/LobbyScheduler'
import type { LobbyScheduledTaskPayload, StoredLobbyState } from './internal-types'

function toFeatureTaskPayload(task: CurrentLobbyScheduledTaskPayload): LobbyScheduledTaskPayload {
    return {
        ...(task.taskPayload || {}),
        type: task.taskName
    } as LobbyScheduledTaskPayload
}

function toRuntimeTaskPayload(payload: LobbyScheduledTaskPayload): CurrentLobbyScheduledTaskPayload {
    const { type, ...taskPayload } = payload as Record<string, unknown> & { type: string }

    return {
        gameKind: 'Jeopardy',
        taskName: type,
        taskPayload
    }
}

type FeatureSchedulerLike = Pick<LobbyScheduler<CurrentLobbyScheduledTaskPayload>, 'cancel' | 'cancelByPrefix' | 'list' | 'schedule'>

export function createJeopardySchedulerAdapter(scheduler: FeatureSchedulerLike) {
    return {
        cancel: (key: string) => scheduler.cancel(key),
        cancelByPrefix: (prefix: string) => scheduler.cancelByPrefix(prefix),
        list: async () => {
            const tasks = await scheduler.list()

            return tasks
                .filter(task => task.payload.gameKind === 'Jeopardy')
                .map(task => ({
                    ...task,
                    payload: toFeatureTaskPayload(task.payload)
                }))
        },
        schedule: (task: { key: string; payload: LobbyScheduledTaskPayload; scheduledAt: number }) =>
            scheduler.schedule({
                ...task,
                payload: toRuntimeTaskPayload(task.payload)
            })
    }
}

function cloneJeopardySession(session: StoredJeopardyGameState['session']): StoredJeopardyGameState['session'] {
    if (!session) {
        return null
    }

    return {
        ...session,
        internal: { ...session.internal },
        meta: {
            ...session.meta,
            pausedTasks: session.meta.pausedTasks.map(task => ({
                ...task,
                payload: {
                    ...task.payload,
                    ...(task.payload.taskPayload
                        ? {
                              taskPayload: {
                                  ...task.payload.taskPayload
                              }
                          }
                        : {})
                }
            }))
        }
    }
}

export function toJeopardyLobbyState(record: LobbyRecordV2): StoredLobbyState {
    const game = record.game as StoredJeopardyGameState

    return {
        chat: [...record.chat],
        createdAt: record.lobby.createdAt,
        creatorUserId: record.lobby.creatorUserId,
        game: {
            config: {
                pack: {
                    ...game.config.pack
                }
            },
            name: 'Jeopardy',
            packAssetId: game.packAssetId,
            packAuthor: game.packAuthor,
            packDateCreated: game.packDateCreated,
            packDeclaration: game.packDeclaration,
            packFileName: game.packFileName,
            packName: game.packName,
            session: cloneJeopardySession(game.session) as StoredLobbyState['game']['session']
        },
        members: record.members.map(member => ({
            ...member,
            playerScore: game.participants.find(participant => participant.memberId === member.id)?.score ?? 0,
            ready: record.readyCheck.votes[member.id] ?? null
        })),
        name: record.lobby.name,
        password: record.lobby.password,
        readyCheck: {
            participants: [...record.readyCheck.participants],
            status: record.readyCheck.status,
            updatedAt: record.readyCheck.updatedAt,
            votes: { ...record.readyCheck.votes }
        },
        lobbyId: record.lobby.id,
        updatedAt: record.lobby.updatedAt
    }
}

export function syncJeopardyRecordFromLobbyState(record: LobbyRecordV2, state: StoredLobbyState): void {
    const game = record.game as StoredJeopardyGameState

    record.readyCheck = {
        participants: [...state.readyCheck.participants],
        status: state.readyCheck.status,
        updatedAt: state.readyCheck.updatedAt,
        votes: Object.fromEntries(record.members.map(member => [member.id, state.members.find(item => item.id === member.id)?.ready ?? null]))
    }

    game.session = cloneJeopardySession(state.game.session as StoredJeopardyGameState['session'])
    game.participants = state.members
        .filter(member => member.role === 'player')
        .map(member => ({
            memberId: member.id,
            role: member.isCreator ? 'master' : 'contestant',
            score: member.playerScore
        }))
}

export function createJeopardyFeatureDeps(
    ctx: LobbyGameContext,
    gameEventRef: { current?: LobbyMutationSuccess['gameEvent'] },
    finalizedSessionRef: { current?: FinalizeLobbySessionInput | null }
) {
    return {
        createGameActionMessage: (payload: LobbyGameActionMessage['payload']) => {
            const message = ctx.createGameActionMessage(payload)
            gameEventRef.current = message
            return message
        },
        getConnectedSocketsCount: ctx.getConnectedSocketsCount,
        persistFinalizedLobbySession: async (session: FinalizeLobbySessionInput | null | undefined) => {
            finalizedSessionRef.current = session || null
        },
        scheduler: createJeopardySchedulerAdapter(ctx.scheduler) as unknown as LobbyScheduler<LobbyScheduledTaskPayload>
    }
}
