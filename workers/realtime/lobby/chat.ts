import type { LobbyRecordV2 } from './types'
import type { LobbyMutationResult } from './operations'
import { nowIso } from './time'

export function addLobbyChatMessage(record: LobbyRecordV2, userId: string, text: string): LobbyMutationResult {
    const member = record.members.find(item => item.id === userId)

    if (!member) {
        return {
            success: false,
            message: 'Join the room before sending messages',
            code: 'not_in_room'
        }
    }

    const normalizedText = text.trim()

    if (!normalizedText.length) {
        return {
            success: false,
            message: 'Message cannot be empty',
            code: 'empty_message'
        }
    }

    record.chat.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        from: member.userNickname,
        fromColor: member.userColor,
        fromUserId: member.id,
        text: normalizedText
    })

    record.chat = record.chat.slice(-100)

    return {
        stateChanged: true,
        success: true
    }
}
