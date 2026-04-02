import type { IdentityProfile } from '../../../shared/contracts/identity'
import type { RealtimeLobbyListItem, RealtimeLobbyMemberRole } from '../../../shared/contracts/realtime-lobby'
import { addLobbyChatMessage } from './chat'
import type { LobbyGameContext } from './game-contract'
import { joinLobbyMember, kickLobbyMember, leaveLobbyMember } from './members'
import type { LobbyJoinResult, LobbyKickResult, LobbyLeaveResult, LobbyMutationResult } from './operations'
import { projectLobbyState } from './projector'
import { startReadyCheck, setReadyCheckVote } from './ready-check'
import { LobbyGameRegistry } from './registry'
import { nowIso } from './time'
import type { LobbyRecordV2, LobbyScheduledTaskPayload } from './types'

export interface CreateLobbyRecordInput {
    game: {
        config: unknown
        kind: 'Clicker' | 'Jeopardy' | 'TicTacToe'
    }
    name?: string
    password?: string
    lobbyId: string
}

export class LobbyAggregate {
    static create(input: CreateLobbyRecordInput, creator: IdentityProfile, registry: LobbyGameRegistry): LobbyRecordV2 {
        const createdAt = nowIso()
        const feature = registry.resolve(input.game.kind)

        return {
            chat: [],
            game: feature.create(input.game.config, creator),
            members: [
                {
                    ...creator,
                    isCreator: true,
                    joinedAt: createdAt,
                    role: 'player'
                }
            ],
            readyCheck: {
                participants: [],
                status: 'idle',
                updatedAt: createdAt,
                votes: {}
            },
            lobby: {
                createdAt,
                creatorUserId: creator.id,
                id: input.lobbyId,
                name: input.name?.trim() || input.lobbyId,
                password: input.password?.trim() || undefined,
                updatedAt: createdAt
            },
            version: 2
        }
    }

    constructor(
        private readonly record: LobbyRecordV2,
        private readonly registry: LobbyGameRegistry,
        private readonly ctx: LobbyGameContext
    ) {}

    buildLobbyListItem(): RealtimeLobbyListItem {
        const feature = this.getFeature()
        const creator = this.record.members.find(member => member.isCreator) || this.record.members[0]

        return {
            id: this.record.lobby.id,
            private: Boolean(this.record.lobby.password),
            createdAt: this.record.lobby.createdAt,
            creatorNickname: creator?.userNickname || '',
            creatorUserId: this.record.lobby.creatorUserId,
            gameName: this.record.game.kind,
            membersCount: this.record.members.length,
            name: this.record.lobby.name,
            playersCount: this.record.members.filter(member => member.role === 'player').length,
            status: feature.getLobbyStatus(this.record),
            updatedAt: this.record.lobby.updatedAt
        }
    }

    buildState(viewerUserId?: string) {
        return projectLobbyState(this.record, this.getFeature(), this.ctx, viewerUserId)
    }

    syncMemberProfile(user: IdentityProfile): boolean {
        const member = this.record.members.find(item => item.id === user.id)

        if (!member) {
            return false
        }

        let changed = false

        if (member.userNickname !== user.userNickname) {
            member.userNickname = user.userNickname
            changed = true
        }

        if (member.userColor !== user.userColor) {
            member.userColor = user.userColor
            changed = true
        }

        if (member.userAvatarUrl !== user.userAvatarUrl) {
            if (user.userAvatarUrl) {
                member.userAvatarUrl = user.userAvatarUrl
            } else {
                delete member.userAvatarUrl
            }

            changed = true
        }

        return changed
    }

    createSessionRecord(reason?: string) {
        return this.getFeature().createSessionRecord(this.record, reason)
    }

    getRecord(): LobbyRecordV2 {
        return this.record
    }

    async handleGameCommand(actorUserId: string, commandName: string, commandPayload: unknown): Promise<LobbyMutationResult> {
        return this.getFeature().handleCommand(this.record, actorUserId, commandName, commandPayload, this.ctx)
    }

    async handleLobbyCommand(actor: IdentityProfile, commandName: string, commandPayload: unknown): Promise<LobbyMutationResult> {
        const feature = this.getFeature()
        const policy = feature.getPolicy(this.record)

        switch (commandName) {
            case 'join': {
                const payload = commandPayload as { password?: string; role?: RealtimeLobbyMemberRole } | null

                if (!payload?.role || !['player', 'spectator'].includes(payload.role)) {
                    return {
                        success: false,
                        message: 'Invalid join role',
                        code: 'invalid_join_role'
                    }
                }

                return joinLobbyMember(this.record, actor, payload.role, payload.password, policy, feature, this.ctx)
            }
            case 'leave':
                return leaveLobbyMember(this.record, actor.id, feature, this.ctx, 'member_left')
            case 'kick': {
                const payload = commandPayload as { userId?: string } | null

                if (!payload?.userId) {
                    return {
                        success: false,
                        message: 'Kick target is required',
                        code: 'invalid_payload'
                    }
                }

                return kickLobbyMember(this.record, actor.id, payload.userId, feature, this.ctx) as Promise<LobbyKickResult>
            }
            case 'tip': {
                const payload = commandPayload as { id?: string; toUserId?: string } | null
                const fromMember = this.record.members.find(member => member.id === actor.id)
                const toMember = this.record.members.find(member => member.id === payload?.toUserId)

                if (!fromMember) {
                    return {
                        success: false,
                        message: 'Join the room before tipping',
                        code: 'not_in_room'
                    }
                }

                if (!payload?.id || !payload?.toUserId || !toMember) {
                    return {
                        success: false,
                        message: 'Tip target is not in this room',
                        code: 'tip_target_missing'
                    }
                }

                if (fromMember.id === toMember.id) {
                    return {
                        success: false,
                        message: 'You cannot tip yourself',
                        code: 'cannot_tip_self'
                    }
                }

                const tipSideEffectResult = await feature.onTip(this.record, fromMember.id, toMember.id, this.ctx)

                if (!tipSideEffectResult.success) {
                    return tipSideEffectResult
                }

                return {
                    ...tipSideEffectResult,
                    lobbyEvent: {
                        eventName: 'tip',
                        eventPayload: {
                            from: fromMember.userNickname,
                            id: payload.id,
                            lobbyId: this.record.lobby.id,
                            to: toMember.userNickname
                        }
                    },
                    success: true
                }
            }
            case 'chat.send': {
                const payload = commandPayload as { text?: string } | null

                return addLobbyChatMessage(this.record, actor.id, payload?.text || '')
            }
            case 'ready.start':
                return startReadyCheck(this.record, actor.id, policy)
            case 'ready.set': {
                const payload = commandPayload as { ready?: boolean } | null

                if (typeof payload?.ready !== 'boolean') {
                    return {
                        success: false,
                        message: 'Ready state is required',
                        code: 'invalid_payload'
                    }
                }

                return setReadyCheckVote(this.record, actor.id, payload.ready)
            }
            case 'game.start':
                return feature.start(this.record, actor.id, this.ctx)
            default:
                return {
                    success: false,
                    message: `Unsupported lobby command: ${commandName}`,
                    code: 'unsupported_command'
                }
        }
    }

    async handleTask(task: LobbyScheduledTaskPayload): Promise<LobbyMutationResult> {
        return this.getFeature().handleTask(this.record, task, this.ctx)
    }

    private getFeature() {
        return this.registry.resolve(this.record.game.kind)
    }
}
