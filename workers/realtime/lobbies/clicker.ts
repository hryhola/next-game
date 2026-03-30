import type { LobbyRoomGameActionMessage, RealtimeClickerSession } from '../../../shared/contracts/realtime-lobby'
import type { FinalizeRoomSessionInput } from '../room-sessions/store'
import type { RoomScheduler } from '../scheduler/RoomScheduler'
import type { ClickerClickResult, GameStartResult, ScheduledTaskResult } from './operations'
import type { RoomScheduledTaskPayload, StoredLobbyState } from './types'
import { nowIso, resetReadyCheck } from './common'

export const CLICKER_ALLOW_DELAY_MIN_MS = 500
export const CLICKER_ALLOW_DELAY_MAX_MS = 3000
export const CLICKER_REENABLE_DELAY_MS = 1000
export const CLICKER_COMPLETE_DELAY_MS = 1000

export function createIdleClickerSession(): RealtimeClickerSession {
    return {
        endedAt: null,
        id: null,
        playerIsClickAllowed: false,
        startedAt: null,
        status: 'idle',
        winnerUserId: null
    }
}

export function getRandomClickerAllowDelayMs(): number {
    return Math.floor(Math.random() * (CLICKER_ALLOW_DELAY_MAX_MS - CLICKER_ALLOW_DELAY_MIN_MS + 1)) + CLICKER_ALLOW_DELAY_MIN_MS
}

export function getClickerSessionTaskPrefix(sessionId: string): string {
    return `clicker:${sessionId}:`
}

export function getClickerAllowClickTaskKey(sessionId: string): string {
    return `${getClickerSessionTaskPrefix(sessionId)}allow-click`
}

export function getClickerReenablePlayerTaskKey(sessionId: string, userId: string): string {
    return `${getClickerSessionTaskPrefix(sessionId)}reenable-player:${userId}`
}

export function getClickerCompleteSessionTaskKey(sessionId: string): string {
    return `${getClickerSessionTaskPrefix(sessionId)}complete-session`
}

type ClickerDeps = {
    createGameActionMessage: (payload: LobbyRoomGameActionMessage['payload']) => LobbyRoomGameActionMessage
    scheduler: RoomScheduler<RoomScheduledTaskPayload>
}

export async function startClickerGame(state: StoredLobbyState, userId: string, deps: ClickerDeps): Promise<GameStartResult> {
    if (state.game.name !== 'Clicker') {
        return {
            success: false,
            message: 'This room does not run Clicker',
            code: 'invalid_game'
        }
    }

    const player = state.members.find(member => member.id === userId && member.role === 'player')

    if (!player) {
        return {
            success: false,
            message: 'Only players can start Clicker',
            code: 'not_a_player'
        }
    }

    if (state.game.session.status !== 'idle') {
        return {
            success: false,
            message: 'A Clicker session is already in progress',
            code: 'game_in_progress'
        }
    }

    const players = state.members.filter(member => member.role === 'player')

    if (!players.length) {
        return {
            success: false,
            message: 'Clicker requires at least 1 player',
            code: 'invalid_player_count'
        }
    }

    players.forEach(member => {
        member.playerIsClickAllowed = true
    })

    const sessionId = crypto.randomUUID()
    const startedAt = nowIso()

    state.game.session = {
        endedAt: null,
        id: sessionId,
        playerIsClickAllowed: false,
        startedAt,
        status: 'waiting',
        winnerUserId: null
    }

    resetReadyCheck(state)

    await deps.scheduler.schedule({
        key: getClickerAllowClickTaskKey(sessionId),
        payload: {
            sessionId,
            type: 'clicker.allow-click'
        },
        scheduledAt: Date.now() + getRandomClickerAllowDelayMs()
    })

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

export async function handleClickerClick(state: StoredLobbyState, userId: string, x: number, y: number, deps: ClickerDeps): Promise<ClickerClickResult> {
    if (state.game.name !== 'Clicker') {
        return {
            success: false,
            message: 'This room does not run Clicker',
            code: 'invalid_game'
        }
    }

    const player = state.members.find(member => member.id === userId && member.role === 'player')

    if (!player) {
        return {
            success: false,
            message: 'Only players can click',
            code: 'not_a_player'
        }
    }

    if (state.game.session.status === 'idle') {
        return {
            success: false,
            message: 'There is no active Clicker session',
            code: 'game_not_started'
        }
    }

    const actionPayload = { x, y }

    if (!player.playerIsClickAllowed) {
        return {
            success: true,
            action: deps.createGameActionMessage({
                actor: {
                    id: player.id,
                    type: 'player'
                },
                actionName: '$Click',
                actionPayload,
                actionResult: {
                    color: player.userColor,
                    status: 'Skipped'
                }
            }),
            stateChanged: false
        }
    }

    if (!state.game.session.playerIsClickAllowed) {
        player.playerIsClickAllowed = false

        if (state.game.session.id) {
            await deps.scheduler.schedule({
                key: getClickerReenablePlayerTaskKey(state.game.session.id, player.id),
                payload: {
                    sessionId: state.game.session.id,
                    type: 'clicker.reenable-player',
                    userId: player.id
                },
                scheduledAt: Date.now() + CLICKER_REENABLE_DELAY_MS
            })
        }

        return {
            success: true,
            action: deps.createGameActionMessage({
                actor: {
                    id: player.id,
                    type: 'player'
                },
                actionName: '$Click',
                actionPayload,
                actionResult: {
                    color: player.userColor,
                    status: 'Failure'
                }
            }),
            stateChanged: true
        }
    }

    if (state.game.session.winnerUserId) {
        return {
            success: true,
            action: deps.createGameActionMessage({
                actor: {
                    id: player.id,
                    type: 'player'
                },
                actionName: '$Click',
                actionPayload,
                actionResult: {
                    color: player.userColor,
                    status: 'NotWin'
                }
            }),
            stateChanged: false
        }
    }

    state.game.session.status = 'resolving'
    state.game.session.winnerUserId = player.id

    if (state.game.session.id) {
        await deps.scheduler.schedule({
            key: getClickerCompleteSessionTaskKey(state.game.session.id),
            payload: {
                sessionId: state.game.session.id,
                type: 'clicker.complete-session',
                winnerUserId: player.id
            },
            scheduledAt: Date.now() + CLICKER_COMPLETE_DELAY_MS
        })
    }

    return {
        success: true,
        action: deps.createGameActionMessage({
            actor: {
                id: player.id,
                type: 'player'
            },
            actionName: '$Click',
            actionPayload,
            actionResult: {
                color: player.userColor,
                status: 'Ok'
            }
        }),
        stateChanged: true
    }
}

export function handleClickerAllowClickTask(state: StoredLobbyState, sessionId: string, deps: ClickerDeps): ScheduledTaskResult {
    if (state.game.name !== 'Clicker' || state.game.session.id !== sessionId || state.game.session.status !== 'waiting') {
        return {
            stateChanged: false
        }
    }

    state.game.session.playerIsClickAllowed = true
    state.game.session.status = 'active'

    return {
        action: deps.createGameActionMessage({
            actor: {
                id: 'game',
                type: 'game'
            },
            actionName: '$ClickAllowed',
            actionPayload: {},
            actionResult: {
                playerIsClickAllowed: true
            }
        }),
        stateChanged: true
    }
}

export function handleClickerReenablePlayerTask(state: StoredLobbyState, sessionId: string, userId: string): ScheduledTaskResult {
    if (state.game.name !== 'Clicker' || state.game.session.id !== sessionId || state.game.session.status === 'idle') {
        return {
            stateChanged: false
        }
    }

    const player = state.members.find(member => member.id === userId && member.role === 'player')

    if (!player || player.playerIsClickAllowed) {
        return {
            stateChanged: false
        }
    }

    player.playerIsClickAllowed = true

    return {
        stateChanged: true
    }
}

export function handleClickerCompleteSessionTask(state: StoredLobbyState, sessionId: string, winnerUserId: string): ScheduledTaskResult {
    if (state.game.name !== 'Clicker' || state.game.session.id !== sessionId || state.game.session.status !== 'resolving') {
        return {
            stateChanged: false
        }
    }

    state.members
        .filter(member => member.role === 'player')
        .forEach(member => {
            member.playerIsClickAllowed = true
        })

    const winner = state.members.find(member => member.id === winnerUserId && member.role === 'player')

    if (winner) {
        winner.playerScore += 1
    }

    const finalizedSession = createCompletedClickerRoomSessionRecord(state, sessionId, winnerUserId)
    state.game.session = createIdleClickerSession()

    return {
        finalizedSession,
        stateChanged: true
    }
}

export async function cancelClickerSessionTasks(scheduler: RoomScheduler<RoomScheduledTaskPayload>, sessionId: string): Promise<void> {
    await scheduler.cancelByPrefix(getClickerSessionTaskPrefix(sessionId))
}

export function createCompletedClickerRoomSessionRecord(state: StoredLobbyState, sessionId: string, winnerUserId: string): FinalizeRoomSessionInput {
    const winner = state.members.find(member => member.id === winnerUserId && member.role === 'player')

    return {
        endedAt: nowIso(),
        id: sessionId,
        resultSummary: {
            players: state.members
                .filter(member => member.role === 'player')
                .map(member => ({
                    id: member.id,
                    playerScore: member.playerScore,
                    userNickname: member.userNickname
                }))
        },
        status: 'completed',
        winnerNickname: winner?.userNickname || null,
        winnerUserId: winner?.id || null
    }
}

export function createAbandonedClickerRoomSessionRecord(state: StoredLobbyState, reason: string): FinalizeRoomSessionInput | null {
    if (state.game.name !== 'Clicker' || state.game.session.status === 'idle' || !state.game.session.id) {
        return null
    }

    return {
        endedAt: nowIso(),
        id: state.game.session.id,
        resultSummary: {
            players: state.members
                .filter(member => member.role === 'player')
                .map(member => ({
                    id: member.id,
                    playerScore: member.playerScore,
                    userNickname: member.userNickname
                })),
            reason
        },
        status: 'abandoned'
    }
}
