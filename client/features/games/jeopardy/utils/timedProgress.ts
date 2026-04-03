import React from 'react'

const CLOCK_SKEW_THRESHOLD_MIN_MS = 1_000
const CLOCK_SKEW_THRESHOLD_RATIO = 0.2

type TimedProgressSnapshot =
    | {
          fallbackProgress: number | null
          isLive: false
          mode: 'fallback-static'
      }
    | {
          endsAtMs: number
          isLive: boolean
          mode: 'absolute'
          startedAtMs: number
      }
    | {
          initialRemainingMs: number
          isLive: boolean
          mode: 'fallback-countdown'
          totalDurationMs: number
          trackedAtMonotonicMs: number
      }

function getMonotonicNowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        const nowMs = performance.now()

        if (Number.isFinite(nowMs)) {
            return nowMs
        }
    }

    return Date.now()
}

function clampProgress(value: number) {
    return Math.max(0, Math.min(100, value))
}

function createTimedProgressSnapshot(
    startedAt: string | null | undefined,
    endsAt: string | null | undefined,
    fallbackProgress: number | null | undefined,
    nowWallMs: number,
    nowMonotonicMs: number,
    debugLabel?: string
): TimedProgressSnapshot {
    const resolvedFallbackProgress = typeof fallbackProgress === 'number' ? clampProgress(fallbackProgress) : null

    if (!startedAt || !endsAt) {
        return {
            fallbackProgress: resolvedFallbackProgress,
            isLive: false,
            mode: 'fallback-static'
        }
    }

    const startedAtMs = new Date(startedAt).getTime()
    const endsAtMs = new Date(endsAt).getTime()

    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startedAtMs) {
        return {
            fallbackProgress: resolvedFallbackProgress,
            isLive: false,
            mode: 'fallback-static'
        }
    }

    const totalDurationMs = endsAtMs - startedAtMs
    const absoluteRemainingMs = Math.max(0, endsAtMs - nowWallMs)

    if (resolvedFallbackProgress === null) {
        return {
            endsAtMs,
            isLive: absoluteRemainingMs > 0,
            mode: 'absolute',
            startedAtMs
        }
    }

    const fallbackRemainingMs = (resolvedFallbackProgress / 100) * totalDurationMs
    const skewThresholdMs = Math.max(CLOCK_SKEW_THRESHOLD_MIN_MS, totalDurationMs * CLOCK_SKEW_THRESHOLD_RATIO)
    const skewMs = absoluteRemainingMs - fallbackRemainingMs

    if (Math.abs(skewMs) > skewThresholdMs) {
        console.warn('[jeopardy-timer] Falling back to monotonic timer because client wall clock appears skewed.', {
            absoluteRemainingMs,
            clientNowIso: new Date(nowWallMs).toISOString(),
            debugLabel,
            endsAt,
            fallbackProgress: resolvedFallbackProgress,
            fallbackRemainingMs,
            skewMs,
            startedAt,
            totalDurationMs
        })

        return {
            initialRemainingMs: fallbackRemainingMs,
            isLive: fallbackRemainingMs > 0,
            mode: 'fallback-countdown',
            totalDurationMs,
            trackedAtMonotonicMs: nowMonotonicMs
        }
    }

    return {
        endsAtMs,
        isLive: absoluteRemainingMs > 0,
        mode: 'absolute',
        startedAtMs
    }
}

function getTimedProgressFromSnapshot(snapshot: TimedProgressSnapshot, nowWallMs: number, nowMonotonicMs: number): number | null {
    if (snapshot.mode === 'fallback-static') {
        return snapshot.fallbackProgress
    }

    if (snapshot.mode === 'absolute') {
        return clampProgress(((snapshot.endsAtMs - nowWallMs) / (snapshot.endsAtMs - snapshot.startedAtMs)) * 100)
    }

    const elapsedMs = Math.max(0, nowMonotonicMs - snapshot.trackedAtMonotonicMs)
    const remainingMs = Math.max(0, snapshot.initialRemainingMs - elapsedMs)

    return clampProgress((remainingMs / snapshot.totalDurationMs) * 100)
}

export function useTimedProgress({
    debugLabel,
    endsAt,
    fallbackProgress,
    isPaused,
    startedAt,
    trackingKey
}: {
    debugLabel?: string
    endsAt: string | null | undefined
    fallbackProgress: number | null | undefined
    isPaused: boolean
    startedAt: string | null | undefined
    trackingKey: string
}) {
    const snapshotKey = `${trackingKey}:${startedAt || 'null'}:${endsAt || 'null'}:${fallbackProgress ?? 'null'}`
    const [timingState, setTimingState] = React.useState(() => {
        const wallMs = Date.now()
        const monotonicMs = getMonotonicNowMs()

        return {
            key: snapshotKey,
            sample: {
                monotonicMs,
                wallMs
            },
            snapshot: createTimedProgressSnapshot(startedAt, endsAt, fallbackProgress, wallMs, monotonicMs, debugLabel)
        }
    })

    React.useEffect(() => {
        const wallMs = Date.now()
        const monotonicMs = getMonotonicNowMs()

        setTimingState({
            key: snapshotKey,
            sample: {
                monotonicMs,
                wallMs
            },
            snapshot: createTimedProgressSnapshot(startedAt, endsAt, fallbackProgress, wallMs, monotonicMs, debugLabel)
        })
    }, [debugLabel, endsAt, fallbackProgress, snapshotKey, startedAt])

    const activeTimingState =
        timingState.key === snapshotKey
            ? timingState
            : {
                  key: snapshotKey,
                  sample: {
                      monotonicMs: 0,
                      wallMs: 0
                  },
                  snapshot: {
                      fallbackProgress: typeof fallbackProgress === 'number' ? clampProgress(fallbackProgress) : null,
                      isLive: false,
                      mode: 'fallback-static'
                  } as TimedProgressSnapshot
              }

    React.useEffect(() => {
        if (isPaused || !activeTimingState.snapshot.isLive) {
            return
        }

        const intervalId = window.setInterval(() => {
            setTimingState(current => {
                if (current.key !== snapshotKey) {
                    return current
                }

                return {
                    ...current,
                    sample: {
                        monotonicMs: getMonotonicNowMs(),
                        wallMs: Date.now()
                    }
                }
            })
        }, 100)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [activeTimingState.snapshot.isLive, isPaused, snapshotKey])

    return getTimedProgressFromSnapshot(activeTimingState.snapshot, activeTimingState.sample.wallMs, activeTimingState.sample.monotonicMs)
}

export const __timedProgressForTests = {
    createTimedProgressSnapshot,
    getTimedProgressFromSnapshot
}
