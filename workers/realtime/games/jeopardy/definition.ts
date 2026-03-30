import type { IdentityProfile } from '../../../../shared/contracts/identity'
import type { LobbyGameFeature } from '../../lobby/game-contract'
import type { LobbyMutationResult, LobbyMutationSuccess } from '../../lobby/operations'
import type { LobbyRecordV2, StoredJeopardyGameState, StoredJeopardyParticipant } from '../../lobby/types'
import { createJeopardyFeatureDeps, syncJeopardyRecordFromLobbyState, toJeopardyLobbyState } from './adapter'
import { JeopardyLobbyFeature } from './feature'

type JeopardyCreateConfig = StoredJeopardyGameState['config'] & {
    packAssetId: string
    packAuthor: string
    packDateCreated: string
    packDeclaration: StoredJeopardyGameState['packDeclaration']
    packFileName: string
}

function toParticipants(record: LobbyRecordV2): StoredJeopardyParticipant[] {
    const existingById = new Map((record.game as StoredJeopardyGameState).participants.map(participant => [participant.memberId, participant]))

    return record.members
        .filter(member => member.role === 'player')
        .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
        .map(member => ({
            memberId: member.id,
            role: member.isCreator ? 'master' : 'contestant',
            score: existingById.get(member.id)?.score ?? 0
        }))
}

function participantsChanged(previous: StoredJeopardyParticipant[], next: StoredJeopardyParticipant[]): boolean {
    return (
        previous.length !== next.length ||
        previous.some(
            (participant, index) =>
                participant.memberId !== next[index]?.memberId || participant.role !== next[index]?.role || participant.score !== next[index]?.score
        )
    )
}

function toMutationResult(result: Awaited<ReturnType<JeopardyLobbyFeature['handleTask']>>): LobbyMutationResult {
    return {
        ...result,
        success: true
    }
}

export function createJeopardyGameFeature(ctx: Parameters<LobbyGameFeature['start']>[2]): LobbyGameFeature<StoredJeopardyGameState> {
    return {
        kind: 'Jeopardy',
        create: (config: unknown, creator: IdentityProfile) => {
            const jeopardyConfig = config as JeopardyCreateConfig

            return {
                config: {
                    pack: {
                        public: true,
                        value: jeopardyConfig.pack.value
                    }
                },
                kind: 'Jeopardy',
                packAssetId: jeopardyConfig.packAssetId,
                packAuthor: jeopardyConfig.packAuthor,
                packDateCreated: jeopardyConfig.packDateCreated,
                packDeclaration: jeopardyConfig.packDeclaration,
                packFileName: jeopardyConfig.packFileName,
                packName: jeopardyConfig.packDeclaration.package._attributes.name,
                participants: [
                    {
                        memberId: creator.id,
                        role: 'master',
                        score: 0
                    }
                ],
                session: null
            }
        },
        createSessionRecord: (record, reason) => {
            const lobbyState = toJeopardyLobbyState(record)
            const feature = new JeopardyLobbyFeature(createJeopardyFeatureDeps(ctx, {}, {}))

            return reason ? feature.createAbandonedLobbySessionRecord(lobbyState, reason) : feature.createCompletedLobbySessionRecord(lobbyState)
        },
        getLobbyStatus: record => ((record.game as StoredJeopardyGameState).session || null ? 'in_progress' : 'waiting'),
        getPolicy: record => ({
            getReadyCheckParticipantIds: () => toParticipants(record).map(participant => participant.memberId),
            isInProgress: currentRecord => Boolean((currentRecord.game as StoredJeopardyGameState).session),
            validateReadyCheck: () => {
                const participants = toParticipants(record)
                const contestants = participants.filter(participant => participant.role === 'contestant')

                if (participants.length < 2 || contestants.length < 1) {
                    return {
                        success: false as const,
                        message: 'Jeopardy requires the master and at least 1 contestant',
                        code: 'invalid_player_count'
                    }
                }

                return null
            },
            validateRole: (currentRecord, user, role) => {
                const existingMember = currentRecord.members.find(member => member.id === user.id)
                const isCreator = existingMember?.isCreator || currentRecord.lobby.creatorUserId === user.id

                if (isCreator && role !== 'player') {
                    return {
                        success: false,
                        message: 'Jeopardy master must stay a player',
                        code: 'creator_must_be_player'
                    }
                }

                return null
            }
        }),
        project: (record, featureCtx, viewerUserId) => {
            const game = record.game as StoredJeopardyGameState

            return {
                config: {
                    pack: {
                        ...game.config.pack
                    }
                },
                ...(game.session && viewerUserId === record.lobby.creatorUserId
                    ? {
                          internal: {
                              ...game.session.internal
                          }
                      }
                    : {}),
                kind: 'Jeopardy' as const,
                name: 'Jeopardy' as const,
                participants: game.participants.map(participant => ({
                    isMaster: participant.role === 'master',
                    memberId: participant.memberId,
                    score: participant.score
                })),
                session: (() => {
                    if (!game.session) {
                        return null
                    }

                    const lobbyState = toJeopardyLobbyState(record)
                    const feature = new JeopardyLobbyFeature(createJeopardyFeatureDeps({ ...ctx, ...featureCtx } as any, {}, {}))

                    return lobbyState.game.session ? feature.toPublicSession(lobbyState.game.session) : null
                })(),
                status: game.session ? 'in_progress' : 'waiting'
            }
        },
        start: async (record, actorUserId, featureCtx) => {
            const lobbyState = toJeopardyLobbyState(record)
            const gameEventRef: { current?: LobbyMutationSuccess['gameEvent'] } = {}
            const finalizedSessionRef: { current?: LobbyMutationSuccess['finalizedSession'] } = {}
            const feature = new JeopardyLobbyFeature(createJeopardyFeatureDeps(featureCtx, gameEventRef, finalizedSessionRef))
            const result = await feature.startGame(lobbyState, actorUserId)

            if (!result.success) {
                return result
            }

            syncJeopardyRecordFromLobbyState(record, lobbyState)

            return {
                ...result,
                finalizedSession: finalizedSessionRef.current,
                gameEvent: gameEventRef.current,
                notifyLobbyList: true,
                stateChanged: true,
                success: true as const
            }
        },
        handleCommand: async (record, actorUserId, commandName, commandPayload, featureCtx) => {
            const lobbyState = toJeopardyLobbyState(record)
            const gameEventRef: { current?: LobbyMutationSuccess['gameEvent'] } = {}
            const finalizedSessionRef: { current?: LobbyMutationSuccess['finalizedSession'] } = {}
            const feature = new JeopardyLobbyFeature(createJeopardyFeatureDeps(featureCtx, gameEventRef, finalizedSessionRef))
            const result = await feature.handleAction(lobbyState, actorUserId, commandName, commandPayload)

            if (!result.success) {
                return result
            }

            syncJeopardyRecordFromLobbyState(record, lobbyState)

            return {
                ...result,
                finalizedSession: finalizedSessionRef.current,
                gameEvent: gameEventRef.current,
                notifyLobbyList: Boolean(finalizedSessionRef.current),
                success: true as const
            }
        },
        handleTask: async (record, task, featureCtx) => {
            const lobbyState = toJeopardyLobbyState(record)
            const gameEventRef: { current?: LobbyMutationSuccess['gameEvent'] } = {}
            const finalizedSessionRef: { current?: LobbyMutationSuccess['finalizedSession'] } = {}
            const feature = new JeopardyLobbyFeature(createJeopardyFeatureDeps(featureCtx, gameEventRef, finalizedSessionRef))
            const result = toMutationResult(
                await feature.handleTask(lobbyState, {
                    ...(task.taskPayload || {}),
                    type: task.taskName
                } as never)
            )

            if (!result.success) {
                return result
            }

            syncJeopardyRecordFromLobbyState(record, lobbyState)

            return {
                ...result,
                finalizedSession: finalizedSessionRef.current,
                gameEvent: gameEventRef.current,
                notifyLobbyList: Boolean(finalizedSessionRef.current),
                success: true as const
            }
        },
        onMembersChanged: async (record, reason, featureCtx) => {
            const game = record.game as StoredJeopardyGameState
            const nextParticipants = toParticipants(record)
            const didChangeParticipants = participantsChanged(game.participants, nextParticipants)

            game.participants = nextParticipants

            if (!didChangeParticipants) {
                return {
                    stateChanged: false,
                    success: true
                }
            }

            if (!game.session) {
                return {
                    stateChanged: true,
                    success: true
                }
            }

            const lobbyState = toJeopardyLobbyState(record)
            const finalizedSessionRef: { current?: LobbyMutationSuccess['finalizedSession'] } = {}
            const feature = new JeopardyLobbyFeature(createJeopardyFeatureDeps(featureCtx, {}, finalizedSessionRef))

            await feature.handlePlayerRemoved(lobbyState, reason === 'member_kicked' ? 'player_kicked' : 'player_left')
            syncJeopardyRecordFromLobbyState(record, lobbyState)

            return {
                finalizedSession: finalizedSessionRef.current,
                notifyLobbyList: true,
                stateChanged: true,
                success: true
            }
        }
    }
}
