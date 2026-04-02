import type { ScheduledTask } from '../../../shared/domain/ports/Scheduler'
import { LobbyScheduler } from './LobbyScheduler'

class MockDurableObjectStorage {
    private values = new Map<string, unknown>()
    alarm: number | null = null
    deleteAlarmCalls = 0
    setAlarmCalls: number[] = []

    async get<T>(key: string): Promise<T | undefined> {
        return this.values.get(key) as T | undefined
    }

    async put(key: string, value: unknown): Promise<void> {
        this.values.set(key, value)
    }

    async getAlarm(): Promise<number | null> {
        return this.alarm
    }

    async setAlarm(scheduledAt: number): Promise<void> {
        this.alarm = scheduledAt
        this.setAlarmCalls.push(scheduledAt)
    }

    async deleteAlarm(): Promise<void> {
        this.alarm = null
        this.deleteAlarmCalls += 1
    }
}

function createTask(key: string, scheduledAt: number, payload: string): ScheduledTask<string> {
    return {
        key,
        payload,
        scheduledAt
    }
}

describe('LobbyScheduler', () => {
    it('keeps scheduled tasks sorted and points the alarm at the earliest task', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('task-late', 300, 'late'))
        await scheduler.schedule(createTask('task-early', 100, 'early'))
        await scheduler.schedule(createTask('task-mid', 200, 'mid'))

        await expect(scheduler.list()).resolves.toEqual([
            createTask('task-early', 100, 'early'),
            createTask('task-mid', 200, 'mid'),
            createTask('task-late', 300, 'late')
        ])
        expect(storage.alarm).toBe(100)
    })

    it('replaces an existing task with the same key and resyncs the alarm from the updated queue', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('session:pick', 100, 'first'))
        await scheduler.schedule(createTask('session:reveal', 150, 'second'))
        await scheduler.schedule(createTask('session:pick', 250, 'replacement'))

        await expect(scheduler.list()).resolves.toEqual([createTask('session:reveal', 150, 'second'), createTask('session:pick', 250, 'replacement')])
        expect(storage.alarm).toBe(150)
    })

    it('does not move the alarm when adding later work behind the current earliest task', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('task-early', 100, 'early'))
        await scheduler.schedule(createTask('task-late', 300, 'late'))

        expect(storage.alarm).toBe(100)
        expect(storage.setAlarmCalls).toEqual([100])
    })

    it('supports exact and prefix cancellation and updates the next alarm accordingly', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('jeopardy:s1:phase.1', 100, 's1-phase-1'))
        await scheduler.schedule(createTask('jeopardy:s1:phase.2', 200, 's1-phase-2'))
        await scheduler.schedule(createTask('jeopardy:s2:phase.1', 150, 's2-phase-1'))

        await scheduler.cancel('jeopardy:s1:phase.1')
        expect(storage.alarm).toBe(150)

        await scheduler.cancelByPrefix('jeopardy:s2:')

        await expect(scheduler.list()).resolves.toEqual([createTask('jeopardy:s1:phase.2', 200, 's1-phase-2')])
        expect(storage.alarm).toBe(200)
    })

    it('deletes the alarm when cancellation removes the final remaining task', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('task-a', 100, 'a'))
        await scheduler.cancel('task-a')

        await expect(scheduler.list()).resolves.toEqual([])
        expect(storage.alarm).toBeNull()
        expect(storage.deleteAlarmCalls).toBeGreaterThan(0)
    })

    it('returns only due tasks and removes completed work without disturbing future tasks', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('task-a', 100, 'a'))
        await scheduler.schedule(createTask('task-b', 200, 'b'))
        await scheduler.schedule(createTask('task-c', 300, 'c'))

        await expect(scheduler.peekDue(220)).resolves.toEqual([createTask('task-a', 100, 'a'), createTask('task-b', 200, 'b')])

        await scheduler.complete(['task-a', 'task-b'])

        await expect(scheduler.list()).resolves.toEqual([createTask('task-c', 300, 'c')])
        expect(storage.alarm).toBe(300)
    })

    it('deletes the alarm when the last queued task is completed', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('task-a', 100, 'a'))
        await scheduler.complete(['task-a'])

        await expect(scheduler.list()).resolves.toEqual([])
        expect(storage.alarm).toBeNull()
        expect(storage.deleteAlarmCalls).toBeGreaterThan(0)
    })

    it('clears the queue and deletes the alarm when no work remains', async () => {
        const storage = new MockDurableObjectStorage()
        const scheduler = new LobbyScheduler<string>(storage as unknown as DurableObjectStorage)

        await scheduler.schedule(createTask('task-a', 100, 'a'))
        await scheduler.schedule(createTask('task-b', 200, 'b'))
        await scheduler.clear()

        await expect(scheduler.list()).resolves.toEqual([])
        expect(storage.alarm).toBeNull()
        expect(storage.deleteAlarmCalls).toBeGreaterThan(0)
    })
})
