/** @jest-environment jsdom */

import { __timedProgressForTests } from './timedProgress'

describe('timedProgress', () => {
    it('uses absolute timing when the client wall clock is close to the server timer window', () => {
        const startedAt = '2026-04-03T19:17:12.603Z'
        const endsAt = '2026-04-03T19:17:17.603Z'
        const snapshot = __timedProgressForTests.createTimedProgressSnapshot(startedAt, endsAt, 80, new Date('2026-04-03T19:17:13.603Z').getTime(), 0)

        expect(snapshot.mode).toBe('absolute')
        expect(__timedProgressForTests.getTimedProgressFromSnapshot(snapshot, new Date('2026-04-03T19:17:14.603Z').getTime(), 1_000)).toBeCloseTo(60, 1)
    })

    it('falls back to a monotonic countdown and logs diagnostics when the client wall clock is skewed', () => {
        const startedAt = '2026-04-03T19:17:12.603Z'
        const endsAt = '2026-04-03T19:17:17.603Z'
        const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        const snapshot = __timedProgressForTests.createTimedProgressSnapshot(
            startedAt,
            endsAt,
            80,
            new Date('2026-04-03T19:17:28.603Z').getTime(),
            100,
            'question:0-0-2:answer-request'
        )

        expect(snapshot.mode).toBe('fallback-countdown')
        expect(__timedProgressForTests.getTimedProgressFromSnapshot(snapshot, new Date('2026-04-03T19:17:28.603Z').getTime(), 1_100)).toBeCloseTo(60, 1)
        expect(warningSpy).toHaveBeenCalledWith(
            '[jeopardy-timer] Falling back to monotonic timer because client wall clock appears skewed.',
            expect.objectContaining({
                debugLabel: 'question:0-0-2:answer-request',
                fallbackProgress: 80
            })
        )

        warningSpy.mockRestore()
    })
})
