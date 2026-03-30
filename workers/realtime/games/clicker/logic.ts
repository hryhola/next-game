import type { LobbyGameActionMessage, RealtimeClickerSession } from '../../../../shared/contracts/realtime-lobby'
import type { FinalizeLobbySessionInput } from '../../lobby-sessions/store'
import type { LobbyGameContext } from '../../lobby/game-contract'
import type { LobbyMutationResult } from '../../lobby/operations'
import { resetReadyCheck } from '../../lobby/ready-check'
import { nowIso } from '../../lobby/time'
import type { LobbyRecordV2, LobbyScheduledTaskPayload, StoredClickerGameState, StoredClickerParticipant } from '../../lobby/types'

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
    createGameActionMessage: (payload: LobbyGameActionMessage['payload']) => LobbyGameActionMessage
    scheduler: LobbyGameContext['scheduler']
}

function getGame(record: LobbyRecordV2): StoredClickerGameState {
    return record.game as StoredClickerGameState
}

function getPlayers(record: LobbyRecordV2) {
    return record.members.filter(member => member.role === 'player')
}

function getParticipant(game: StoredClickerGameState, userId: string): StoredClickerParticipant | undefined {
    return game.participants.find(participant => participant.memberId === userId)
}

export async function startClickerGame(record: LobbyRecordV2, userId: string, deps: ClickerDeps): Promise<LobbyMutationResult> {
    const game = getGame(record)

    if (game.kind !== 'Clicker') {
        return {
            success: false,
            message: 'This room does not run Clicker',
            code: 'invalid_game'
        }
    }

    const player = record.members.find(member => member.id === userId && member.role === 'player')

    if (!player) {
        return {
            success: false,
            message: 'Only players can start Clicker',
            code: 'not_a_player'
        }
    }

    if (game.session.status !== 'idle') {
        return {
            success: false,
            message: 'A Clicker session is already in progress',
            code: 'game_in_progress'
        }
    }

    const players = getPlayers(record)

    if (!players.length) {
        return {
            success: false,
            message: 'Clicker requires at least 1 player',
            code: 'invalid_player_count'
        }
    }

    game.participants.forEach(participant => {
        participant.isClickAllowed = true
    })

    const sessionId = crypto.randomUUID()
    const startedAt = nowIso()

    game.session = {
        endedAt: null,
        id: sessionId,
        playerIsClickAllowed: false,
        startedAt,
        status: 'waiting',
        winnerUserId: null
    }

    resetReadyCheck(record)

    await deps.scheduler.schedule({
        key: getClickerAllowClickTaskKey(sessionId),
        payload: {
            gameKind: game.kind,
            taskName: 'clicker.allow-click',
            taskPayload: {
                sessionId
            }
        },
        scheduledAt: Date.now() + getRandomClickerAllowDelayMs()
    })

    return {
        success: true,
        startedSession: {
            gameName: game.kind,
            id: sessionId,
            initiatedByUserId: userId,
            startedAt
        },
        stateChanged: true
    }
}

export async function handleClickerClick(record: LobbyRecordV2, userId: string, x: number, y: number, deps: ClickerDeps): Promise<LobbyMutationResult> {
    const game = getGame(record)

    if (game.kind !== 'Clicker') {
        return {
            success: false,
            message: 'This room does not run Clicker',
            code: 'invalid_game'
        }
    }

    const player = record.members.find(member => member.id === userId && member.role === 'player')
    const participant = getParticipant(game, userId)

    if (!player || !participant) {
        return {
            success: false,
            message: 'Only players can click',
            code: 'not_a_player'
        }
    }

    if (game.session.status === 'idle') {
        return {
            success: false,
            message: 'There is no active Clicker session',
            code: 'game_not_started'
        }
    }

    const actionPayload = { x, y }

    if (!participant.isClickAllowed) {
        return {
            success: true,
            gameEvent: deps.createGameActionMessage({
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

    if (!game.session.playerIsClickAllowed) {
        participant.isClickAllowed = false

        if (game.session.id) {
            await deps.scheduler.schedule({
                key: getClickerReenablePlayerTaskKey(game.session.id, player.id),
                payload: {
                    gameKind: game.kind,
                    taskName: 'clicker.reenable-player',
                    taskPayload: {
                        sessionId: game.session.id,
                        userId: player.id
                    }
                },
                scheduledAt: Date.now() + CLICKER_REENABLE_DELAY_MS
            })
        }

        return {
            success: true,
            gameEvent: deps.createGameActionMessage({
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

    if (game.session.winnerUserId) {
        return {
            success: true,
            gameEvent: deps.createGameActionMessage({
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

    game.session.status = 'resolving'
    game.session.winnerUserId = player.id

    if (game.session.id) {
        await deps.scheduler.schedule({
            key: getClickerCompleteSessionTaskKey(game.session.id),
            payload: {
                gameKind: game.kind,
                taskName: 'clicker.complete-session',
                taskPayload: {
                    sessionId: game.session.id,
                    winnerUserId: player.id
                }
            },
            scheduledAt: Date.now() + CLICKER_COMPLETE_DELAY_MS
        })
    }

    return {
        success: true,
        gameEvent: deps.createGameActionMessage({
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

export function handleClickerAllowClickTask(record: LobbyRecordV2, sessionId: string, deps: ClickerDeps): LobbyMutationResult {
    const game = getGame(record)

    if (game.kind !== 'Clicker' || game.session.id !== sessionId || game.session.status !== 'waiting') {
        return {
            success: true,
            stateChanged: false
        }
    }

    game.session.playerIsClickAllowed = true
    game.session.status = 'active'

    return {
        success: true,
        gameEvent: deps.createGameActionMessage({
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

export function handleClickerReenablePlayerTask(record: LobbyRecordV2, sessionId: string, userId: string): LobbyMutationResult {
    const game = getGame(record)

    if (game.kind !== 'Clicker' || game.session.id !== sessionId || game.session.status === 'idle') {
        return {
            success: true,
            stateChanged: false
        }
    }

    const participant = getParticipant(game, userId)

    if (!participant || participant.isClickAllowed) {
        return {
            success: true,
            stateChanged: false
        }
    }

    participant.isClickAllowed = true

    return {
        success: true,
        stateChanged: true
    }
}

export function handleClickerCompleteSessionTask(record: LobbyRecordV2, sessionId: string, winnerUserId: string): LobbyMutationResult {
    const game = getGame(record)

    if (game.kind !== 'Clicker' || game.session.id !== sessionId || game.session.status !== 'resolving') {
        return {
            success: true,
            stateChanged: false
        }
    }

    game.participants.forEach(participant => {
        participant.isClickAllowed = true
    })

    const winner = getParticipant(game, winnerUserId)

    if (winner) {
        winner.score += 1
    }

    const finalizedSession = createCompletedClickerLobbySessionRecord(record, sessionId, winnerUserId)
    game.session = createIdleClickerSession()

    return {
        finalizedSession,
        notifyLobbyList: true,
        stateChanged: true,
        success: true
    }
}

export async function cancelClickerSessionTasks(scheduler: LobbyGameContext['scheduler'], sessionId: string): Promise<void> {
    await scheduler.cancelByPrefix(getClickerSessionTaskPrefix(sessionId))
}

export function createCompletedClickerLobbySessionRecord(record: LobbyRecordV2, sessionId: string, winnerUserId: string): FinalizeLobbySessionInput {
    const game = getGame(record)
    const winner = record.members.find(member => member.id === winnerUserId && member.role === 'player')

    return {
        endedAt: nowIso(),
        id: sessionId,
        resultSummary: {
            players: game.participants
                .map(participant => {
                    const member = record.members.find(item => item.id === participant.memberId && item.role === 'player')

                    return member
                        ? {
                              id: member.id,
                              playerScore: participant.score,
                              userNickname: member.userNickname
                          }
                        : null
                })
                .filter(Boolean)
        },
        status: 'completed',
        winnerNickname: winner?.userNickname || null,
        winnerUserId: winner?.id || null
    }
}

export function createAbandonedClickerLobbySessionRecord(record: LobbyRecordV2, reason: string): FinalizeLobbySessionInput | null {
    const game = getGame(record)

    if (game.kind !== 'Clicker' || game.session.status === 'idle' || !game.session.id) {
        return null
    }

    return {
        endedAt: nowIso(),
        id: game.session.id,
        resultSummary: {
            players: game.participants
                .map(participant => {
                    const member = record.members.find(item => item.id === participant.memberId && item.role === 'player')

                    return member
                        ? {
                              id: member.id,
                              playerScore: participant.score,
                              userNickname: member.userNickname
                          }
                        : null
                })
                .filter(Boolean),
            reason
        },
        status: 'abandoned'
    }
}
