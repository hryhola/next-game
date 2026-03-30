import type { LobbyGamePolicy } from './game-contract'
import type { LobbyMutationResult } from './operations'
import type { LobbyRecordV2 } from './types'
import { nowIso } from './time'

export function resetReadyCheck(record: LobbyRecordV2): void {
    record.readyCheck = {
        participants: [],
        status: 'idle',
        updatedAt: nowIso(),
        votes: {}
    }
}

export function startReadyCheck(record: LobbyRecordV2, userId: string, policy: LobbyGamePolicy): LobbyMutationResult {
    if (record.lobby.creatorUserId !== userId) {
        return {
            success: false,
            message: 'Only the lobby creator can start the ready check',
            code: 'forbidden'
        }
    }

    if (policy.isInProgress(record)) {
        return {
            success: false,
            message: 'Cannot start a ready check during an active game',
            code: 'game_in_progress'
        }
    }

    const validation = policy.validateReadyCheck(record)

    if (validation) {
        return validation
    }

    const participants = policy.getReadyCheckParticipantIds(record)

    record.readyCheck = {
        participants,
        status: 'active',
        updatedAt: nowIso(),
        votes: Object.fromEntries(participants.map(participantId => [participantId, null]))
    }

    return {
        stateChanged: true,
        success: true
    }
}

export function setReadyCheckVote(record: LobbyRecordV2, userId: string, ready: boolean): LobbyMutationResult {
    if (record.readyCheck.status !== 'active') {
        return {
            success: false,
            message: 'There is no active ready check',
            code: 'ready_check_inactive'
        }
    }

    if (!record.readyCheck.participants.includes(userId)) {
        return {
            success: false,
            message: 'Only active players can respond to the ready check',
            code: 'not_ready_participant'
        }
    }

    const member = record.members.find(item => item.id === userId)

    if (!member) {
        return {
            success: false,
            message: 'Join the room before responding',
            code: 'not_in_room'
        }
    }

    record.readyCheck.votes[userId] = ready
    record.readyCheck.updatedAt = nowIso()

    if (!ready) {
        record.readyCheck.status = 'failed'

        return {
            stateChanged: true,
            success: true
        }
    }

    const everyoneReady = record.readyCheck.participants.every(participantId => record.readyCheck.votes[participantId] === true)

    if (everyoneReady) {
        record.readyCheck.status = 'success'
    }

    return {
        stateChanged: true,
        success: true
    }
}
