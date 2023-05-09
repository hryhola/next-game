import { Job, scheduleJob } from 'node-schedule'

export class DelayedEvent {
    private delayInSeconds: number
    private callback?: () => void
    private job: Job | null
    private resolvePromise!: (value: unknown) => void
    public completion: Promise<unknown>
    private startTimestamp: number
    private elapsedTime: number

    get isRunning() {
        return this.job !== null
    }

    constructor(delayInSeconds: number, callback?: () => void) {
        this.delayInSeconds = delayInSeconds
        this.callback = callback
        this.job = null
        this.startTimestamp = 0
        this.elapsedTime = 0
        this.completion = new Promise(resolve => {
            this.resolvePromise = resolve
        })
    }

    private calculateTimeLeft(): number {
        const remainingTime = this.delayInSeconds * 1000 - this.elapsedTime
        return Math.max(remainingTime, 0)
    }

    private createJob(timeLeft: number): void {
        this.job = scheduleJob(new Date(Date.now() + timeLeft), () => {
            if (this.callback) {
                this.callback()
            }
            this.resolvePromise(null)
        })
    }

    start(): this {
        if (this.job) {
            throw new Error('Cannot start a DelayedEvent that is already started')
        }

        this.startTimestamp = Date.now()
        const timeLeft = this.calculateTimeLeft()
        this.createJob(timeLeft)
        return this
    }

    stop() {
        if (this.job) {
            this.job.cancel()
        }

        this.job = null
        this.startTimestamp = 0
        this.elapsedTime = 0
    }

    pause(): this {
        if (!this.job) {
            throw new Error('Cannot pause a DelayedEvent that has is not running')
        }

        this.elapsedTime += Date.now() - this.startTimestamp
        this.job.cancel()
        this.job = null
        return this
    }

    resume(): this {
        if (this.job) {
            throw new Error('Cannot resume a DelayedEvent that is not paused')
        }

        this.startTimestamp = Date.now()
        const timeLeft = this.calculateTimeLeft()
        this.createJob(timeLeft)
        return this
    }

    resolve(): void {
        if (this.job) {
            this.job.cancel()
            this.job = null
        }

        this.startTimestamp = 0
        this.elapsedTime = 0

        if (this.callback) {
            this.callback()
        }

        this.resolvePromise(null)
    }
}
