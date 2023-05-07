import { Job, scheduleJob } from 'node-schedule'

export class DelayedEvent {
    private delayInSeconds: number
    private callback?: () => void
    private job: Job | null
    private resolvePromise!: (value: unknown) => void
    public completion: Promise<unknown>
    private pauseTime: number | null

    constructor(delayInSeconds: number, callback?: () => void) {
        this.delayInSeconds = delayInSeconds
        this.callback = callback
        this.job = null
        this.pauseTime = null
        this.completion = new Promise(resolve => {
            this.resolvePromise = resolve
        })
    }

    start() {
        if (this.job) {
            throw new Error('Cannot start a DelayedEvent that is already started')
        }
        this.job = scheduleJob(new Date(Date.now() + this.delayInSeconds * 1000), () => {
            if (this.callback) {
                this.callback()
            }
            this.resolvePromise(null)
        })
        this.pauseTime = null
        return this
    }

    pause() {
        if (!this.job) {
            throw new Error('Cannot pause a DelayedEvent that has not been started')
        }
        this.pauseTime = Date.now()
        this.job.cancel()
        this.job = null
        return this
    }

    resume() {
        if (this.job || this.pauseTime === null) {
            throw new Error('Cannot resume a DelayedEvent that is not paused')
        }
        const timeLeft = this.pauseTime !== null ? this.pauseTime + this.delayInSeconds * 1000 - Date.now() : this.delayInSeconds * 1000
        this.job = scheduleJob(new Date(Date.now() + timeLeft), () => {
            if (this.callback) {
                this.callback()
            }
            this.resolvePromise(null)
        })
        this.pauseTime = null
        return this
    }

    resolve() {
        if (!this.job) {
            throw new Error('Cannot resolve a DelayedEvent that without job!')
        }

        this.job.cancel()

        if (this.callback) {
            this.callback()
        }
        this.resolvePromise(null)

        this.pauseTime = null
    }
}
