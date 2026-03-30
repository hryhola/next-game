import type { IdentityProfile } from '../../../shared/contracts/identity'
import type { RealtimeLobbyMemberRole } from '../../../shared/contracts/realtime-lobby'
import type { LobbyGameFeature, LobbyGamePolicy, LobbyGameContext } from './game-contract'
import type { LobbyJoinResult, LobbyKickResult, LobbyLeaveResult } from './operations'
import type { LobbyRecordV2, StoredLobbyMember } from './types'
import { resetReadyCheck } from './ready-check'
import { nowIso } from './time'

function refreshMember(member: StoredLobbyMember, profile: IdentityProfile): void {
    member.userAvatarUrl = profile.userAvatarUrl
    member.userColor = profile.userColor
    member.userNickname = profile.userNickname
}

export async function joinLobbyMember(
    record: LobbyRecordV2,
    user: IdentityProfile,
    role: RealtimeLobbyMemberRole,
    password: string | undefined,
    policy: LobbyGamePolicy,
    feature: LobbyGameFeature,
    ctx: LobbyGameContext
): Promise<LobbyJoinResult> {
    if (record.lobby.password && record.lobby.password !== (password || '')) {
        return {
            success: false,
            message: 'Incorrect password',
            code: 'incorrect_password'
        }
    }

    const existingMember = record.members.find(member => member.id === user.id)

    if (existingMember) {
        refreshMember(existingMember, user)

        if (existingMember.role === role) {
            return {
                stateChanged: true,
                success: true,
                message: `${user.userNickname} rejoined the room`,
                notifyLobbyList: true
            }
        }

        if (policy.isInProgress(record)) {
            return {
                success: false,
                message: 'Cannot change roles during an active game',
                code: 'game_in_progress'
            }
        }

        const roleValidation = policy.validateRole(record, user, role)

        if (roleValidation) {
            return roleValidation
        }

        existingMember.role = role

        const membersChangedResult = await feature.onMembersChanged(record, 'member_role_changed', ctx)

        if (!membersChangedResult.success) {
            return membersChangedResult
        }

        resetReadyCheck(record)

        return {
            ...membersChangedResult,
            message: `${user.userNickname} switched to ${role}`,
            notifyLobbyList: true,
            stateChanged: true
        }
    }

    const roleValidation = policy.validateRole(record, user, role)

    if (roleValidation) {
        return roleValidation
    }

    record.members.push({
        ...user,
        isCreator: false,
        joinedAt: nowIso(),
        role
    })

    const membersChangedResult = await feature.onMembersChanged(record, 'member_joined', ctx)

    if (!membersChangedResult.success) {
        return membersChangedResult
    }

    resetReadyCheck(record)

    return {
        ...membersChangedResult,
        message: `${user.userNickname} joined as ${role}`,
        notifyLobbyList: true,
        stateChanged: true
    }
}

export async function leaveLobbyMember(
    record: LobbyRecordV2,
    userId: string,
    feature: LobbyGameFeature,
    ctx: LobbyGameContext,
    removalReason: 'member_kicked' | 'member_left'
): Promise<LobbyLeaveResult> {
    const member = record.members.find(item => item.id === userId)

    if (!member) {
        return {
            success: false,
            message: 'You are not in this room',
            code: 'not_in_room'
        }
    }

    record.members = record.members.filter(item => item.id !== userId)

    if (!record.members.length) {
        return {
            destroyed: true,
            message: 'Lobby closed because the last member left',
            notifyLobbyList: true,
            stateChanged: true,
            success: true
        }
    }

    let membersChangedReason: 'creator_reassigned' | 'member_kicked' | 'member_left' = removalReason

    if (member.isCreator) {
        record.members
            .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
            .forEach((item, index) => {
                item.isCreator = index === 0
            })

        record.lobby.creatorUserId = record.members.find(item => item.isCreator)?.id || record.members[0].id
        membersChangedReason = 'creator_reassigned'
    }

    const membersChangedResult = await feature.onMembersChanged(record, membersChangedReason, ctx)

    if (!membersChangedResult.success) {
        return membersChangedResult
    }

    resetReadyCheck(record)

    return {
        ...membersChangedResult,
        message: `${member.userNickname} left the room`,
        notifyLobbyList: true,
        stateChanged: true,
        success: true
    }
}

export async function kickLobbyMember(
    record: LobbyRecordV2,
    actorUserId: string,
    targetUserId: string,
    feature: LobbyGameFeature,
    ctx: LobbyGameContext
): Promise<LobbyKickResult> {
    if (record.lobby.creatorUserId !== actorUserId) {
        return {
            success: false,
            message: 'Only the lobby creator can kick players',
            code: 'forbidden'
        }
    }

    const member = record.members.find(item => item.id === targetUserId)

    if (!member) {
        return {
            success: false,
            message: 'Member not found',
            code: 'member_not_found'
        }
    }

    if (member.isCreator) {
        return {
            success: false,
            message: 'The lobby creator cannot be kicked',
            code: 'cannot_kick_creator'
        }
    }

    record.members = record.members.filter(item => item.id !== targetUserId)

    const membersChangedResult = await feature.onMembersChanged(record, 'member_kicked', ctx)

    if (!membersChangedResult.success) {
        return membersChangedResult
    }

    resetReadyCheck(record)

    return {
        ...membersChangedResult,
        notifyLobbyList: true,
        lobbyEvent: {
            eventName: 'kick',
            eventPayload: {
                memberId: targetUserId
            }
        },
        stateChanged: true,
        success: true
    }
}
