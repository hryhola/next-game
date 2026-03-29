import type { ScheduledTask, Scheduler } from '../../../shared/domain/ports/Scheduler'

const STORAGE_KEY = 'scheduler.tasks'

export class RoomScheduler<TPayload> implements Scheduler<TPayload> {
    constructor(private readonly storage: DurableObjectStorage) {}

    async schedule(task: ScheduledTask<TPayload>): Promise<void> {
        const tasks = await this.getTasks()
        const filteredTasks = tasks.filter(existingTask => existingTask.key !== task.key)
        filteredTasks.push(task)
        filteredTasks.sort((left, right) => left.scheduledAt - right.scheduledAt)
        await this.storage.put(STORAGE_KEY, filteredTasks)
        await this.syncAlarm(filteredTasks)
    }

    async cancel(key: string): Promise<void> {
        const tasks = (await this.getTasks()).filter(task => task.key !== key)
        await this.storage.put(STORAGE_KEY, tasks)
        await this.syncAlarm(tasks)
    }

    async cancelByPrefix(prefix: string): Promise<void> {
        const tasks = (await this.getTasks()).filter(task => !task.key.startsWith(prefix))
        await this.storage.put(STORAGE_KEY, tasks)
        await this.syncAlarm(tasks)
    }

    async complete(keys: string[]): Promise<void> {
        if (!keys.length) {
            return
        }

        const keysSet = new Set(keys)
        const tasks = (await this.getTasks()).filter(task => !keysSet.has(task.key))
        await this.storage.put(STORAGE_KEY, tasks)
        await this.syncAlarm(tasks)
    }

    async clear(): Promise<void> {
        await this.storage.put(STORAGE_KEY, [])
        await this.storage.deleteAlarm()
    }

    async peekDue(now: number = Date.now()): Promise<ScheduledTask<TPayload>[]> {
        return (await this.getTasks()).filter(task => task.scheduledAt <= now)
    }

    async list(): Promise<ScheduledTask<TPayload>[]> {
        return this.getTasks()
    }

    private async getTasks(): Promise<ScheduledTask<TPayload>[]> {
        return ((await this.storage.get<ScheduledTask<TPayload>[]>(STORAGE_KEY)) || []).sort((left, right) => left.scheduledAt - right.scheduledAt)
    }

    private async syncAlarm(tasks: ScheduledTask<TPayload>[]): Promise<void> {
        const nextTask = tasks[0]

        if (!nextTask) {
            await this.storage.deleteAlarm()
            return
        }

        const currentAlarm = await this.storage.getAlarm()

        if (currentAlarm !== nextTask.scheduledAt) {
            await this.storage.setAlarm(nextTask.scheduledAt)
        }
    }
}
