import type { RealtimeClickerSession } from '../../../shared/contracts/realtime-lobby'

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
