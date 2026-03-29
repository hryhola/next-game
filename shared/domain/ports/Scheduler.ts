export interface ScheduledTask<TPayload = unknown> {
    key: string
    payload: TPayload
    scheduledAt: number
}

export interface Scheduler<TPayload = unknown> {
    cancel(key: string): Promise<void> | void
    schedule(task: ScheduledTask<TPayload>): Promise<void> | void
}
