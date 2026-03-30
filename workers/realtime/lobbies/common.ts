import type { IdentityProfile } from '../../../shared/contracts/identity'
import type { RealtimeLobbyMemberRole } from '../../../shared/contracts/realtime-lobby'
import type { StoredLobbyMember, StoredLobbyState } from './types'
import type { RoomJoinResult, RoomMutationResult, RoomTipResult } from './operations'

export function nowIso(): string {
    return new Date().toISOString()
}

export function refreshStoredMember(member: StoredLobbyMember, profile: IdentityProfile): void {
    member.userNickname = profile.userNickname
    member.userColor = profile.userColor
    member.userAvatarUrl = profile.userAvatarUrl
}

export function isGameInProgress(state: StoredLobbyState): boolean {
    if (state.game.name === 'Clicker') {
        return state.game.session.status !== 'idle'
    }

    if (state.game.name === 'Jeopardy') {
        return Boolean(state.game.session)
    }

    return state.game.session.status === 'active'
}

export function resetReadyCheck(state: StoredLobbyState): void {
    state.members.forEach(member => {
        member.ready = null
    })

    state.readyCheck = {
        participants: [],
        status: 'idle',
        updatedAt: nowIso()
    }
}

export function normalizePlayerAssignments(state: StoredLobbyState): void {
    const orderedPlayers = state.members.filter(member => member.role === 'player').sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))

    state.members.forEach(member => {
        member.playerScore = member.playerScore || 0
        member.playerIsClickAllowed = member.role === 'player' ? member.playerIsClickAllowed : true
    })

    if (state.game.name === 'TicTacToe') {
        orderedPlayers.forEach((member, index) => {
            member.playerChar = index === 0 ? 'x' : 'o'
        })

        state.members
            .filter(member => member.role !== 'player')
            .forEach(member => {
                member.playerChar = null
            })

        return
    }

    state.members.forEach(member => {
        member.playerChar = null

        if (member.role !== 'player') {
            member.playerIsClickAllowed = true
        }
    })
}

export function joinRoom(state: StoredLobbyState, user: IdentityProfile, role: RealtimeLobbyMemberRole, password?: string): RoomJoinResult {
    if (state.password && state.password !== (password || '')) {
        return {
            success: false,
            message: 'Incorrect password',
            code: 'incorrect_password'
        }
    }

    const existingMember = state.members.find(member => member.id === user.id)
    const maxPlayers = state.game.name === 'TicTacToe' ? 2 : Number.POSITIVE_INFINITY

    if (existingMember) {
        if (existingMember.isCreator && state.game.name === 'Jeopardy' && role !== 'player') {
            return {
                success: false,
                message: 'Jeopardy master must stay a player',
                code: 'creator_must_be_player'
            }
        }

        if (existingMember.role === role) {
            refreshStoredMember(existingMember, user)

            return {
                success: true,
                message: `${user.userNickname} rejoined the room`
            }
        }

        if (isGameInProgress(state)) {
            return {
                success: false,
                message: 'Cannot change roles during an active game',
                code: 'game_in_progress'
            }
        }

        if (role === 'player' && state.members.filter(member => member.role === 'player' && member.id !== user.id).length >= maxPlayers) {
            return {
                success: false,
                message: 'Player slots are full',
                code: 'player_slots_full'
            }
        }

        refreshStoredMember(existingMember, user)
        existingMember.role = role
        normalizePlayerAssignments(state)
        resetReadyCheck(state)

        return {
            success: true,
            message: `${user.userNickname} switched to ${role}`
        }
    }

    if (user.id === state.creatorUserId && state.game.name === 'Jeopardy' && role !== 'player') {
        return {
            success: false,
            message: 'Jeopardy master must stay a player',
            code: 'creator_must_be_player'
        }
    }

    if (role === 'player' && state.members.filter(member => member.role === 'player').length >= maxPlayers) {
        return {
            success: false,
            message: 'Player slots are full',
            code: 'player_slots_full'
        }
    }

    state.members.push({
        ...user,
        isCreator: false,
        joinedAt: nowIso(),
        playerChar: null,
        playerIsClickAllowed: true,
        playerScore: 0,
        ready: null,
        role
    })

    normalizePlayerAssignments(state)
    resetReadyCheck(state)

    return {
        success: true,
        message: `${user.userNickname} joined as ${role}`
    }
}

export function tipMember(state: StoredLobbyState, fromUserId: string, tipId: string, toUserId: string): RoomTipResult {
    const fromMember = state.members.find(member => member.id === fromUserId)
    const toMember = state.members.find(member => member.id === toUserId)

    if (!fromMember) {
        return {
            success: false,
            message: 'Join the room before tipping',
            code: 'not_in_room'
        }
    }

    if (!toMember) {
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

    return {
        success: true,
        tip: {
            from: fromMember.userNickname,
            id: tipId,
            lobbyId: state.roomId,
            to: toMember.userNickname
        }
    }
}

export function addChatMessage(state: StoredLobbyState, userId: string, text: string): RoomMutationResult {
    const member = state.members.find(item => item.id === userId)

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

    state.chat.push({
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        from: member.userNickname,
        fromColor: member.userColor,
        fromUserId: member.id,
        text: normalizedText
    })

    state.chat = state.chat.slice(-100)

    return {
        success: true
    }
}

export function startReadyCheck(state: StoredLobbyState, userId: string): RoomMutationResult {
    if (state.creatorUserId !== userId) {
        return {
            success: false,
            message: 'Only the lobby creator can start the ready check',
            code: 'forbidden'
        }
    }

    if (isGameInProgress(state)) {
        return {
            success: false,
            message: 'Cannot start a ready check during an active game',
            code: 'game_in_progress'
        }
    }

    const players = state.members.filter(member => member.role === 'player')
    const isValidPlayerCount = state.game.name === 'Clicker' ? players.length >= 1 : state.game.name === 'Jeopardy' ? players.length >= 2 : players.length === 2

    if (!isValidPlayerCount) {
        return {
            success: false,
            message:
                state.game.name === 'Clicker'
                    ? 'Clicker requires at least 1 player'
                    : state.game.name === 'Jeopardy'
                      ? 'Jeopardy requires the master and at least 1 contestant'
                      : 'TicTacToe requires exactly 2 players',
            code: 'invalid_player_count'
        }
    }

    state.members.forEach(member => {
        member.ready = players.some(player => player.id === member.id) ? null : member.ready
    })

    state.readyCheck = {
        participants: players.map(player => player.id),
        status: 'active',
        updatedAt: nowIso()
    }

    return {
        success: true
    }
}

export function setReadyState(state: StoredLobbyState, userId: string, ready: boolean): RoomMutationResult {
    if (state.readyCheck.status !== 'active') {
        return {
            success: false,
            message: 'There is no active ready check',
            code: 'ready_check_inactive'
        }
    }

    if (!state.readyCheck.participants.includes(userId)) {
        return {
            success: false,
            message: 'Only active players can respond to the ready check',
            code: 'not_ready_participant'
        }
    }

    const member = state.members.find(item => item.id === userId)

    if (!member) {
        return {
            success: false,
            message: 'Join the room before responding',
            code: 'not_in_room'
        }
    }

    member.ready = ready
    state.readyCheck.updatedAt = nowIso()

    if (!ready) {
        state.readyCheck.status = 'failed'

        return {
            success: true
        }
    }

    const everyoneReady = state.readyCheck.participants.every(participantId => {
        const participant = state.members.find(memberItem => memberItem.id === participantId)
        return participant?.ready === true
    })

    if (everyoneReady) {
        state.readyCheck.status = 'success'
    }

    return {
        success: true
    }
}
