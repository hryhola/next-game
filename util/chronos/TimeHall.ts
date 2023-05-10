import { DelayedEvent } from './DelayedEvent'

export class TimeHall {
    private events: Record<string, DelayedEvent>
    private hallPausedEvents: string[] = []

    constructor() {
        this.events = {}
    }

    get nonPausedEvents(): [string[], DelayedEvent[]] {
        return Object.entries(this.events).reduce(
            (acc, [key, event]) => {
                if (event.isRunning) {
                    acc[0].push(key)
                    acc[1].push(event)
                }
                return acc
            },
            [[], []] as [string[], DelayedEvent[]]
        )
    }

    get(name: string) {
        return this.events[name] || null
    }

    createEvent(name: string, delayInSeconds: number, callback?: () => void): DelayedEvent {
        const event = new DelayedEvent(delayInSeconds, () => {
            if (this.events[name]) {
                delete this.events[name]
            }

            if (callback) {
                callback()
            }
        })

        this.events[name] = event

        return event
    }

    startEvent(name: string): void {
        const event = this.events[name]

        if (!event) {
            throw new Error(`Event "${name}" not found`)
        }

        event.start()
    }

    createAndStartEvent(name: string, delayInSeconds: number, callback?: () => void): DelayedEvent {
        const event = this.createEvent(name, delayInSeconds, callback)
        event.start()
        return event
    }

    cancelEvent(name: string, throwNotFound = false) {
        if (this.events[name]) {
            this.events[name].stop()

            delete this.events[name]
        } else if (throwNotFound) {
            throw new Error(`Event "${name}" not found`)
        }
    }

    resolveEvent(name: string) {
        const event = this.events[name]

        if (!event) {
            throw new Error(`Event "${name}" not found`)
        }

        event.resolve()
    }

    pauseIfRunning(name: string, throwNotFound = false): void {
        const event = this.events[name]

        if (!event) {
            if (throwNotFound) throw new Error(`Event "${name}" not found`)
            else return
        }

        if (event.isRunning) event.pause()
    }

    resumeEventIfPaused(name: string, throwNotFound = false): void {
        const event = this.events[name]

        if (!event) {
            if (throwNotFound) throw new Error(`Event "${name}" not found`)
            else return
        }

        if (!event.isRunning) event.resume()
    }

    pause() {
        const [eventNames, events] = this.nonPausedEvents

        this.hallPausedEvents = [...this.hallPausedEvents, ...eventNames]

        for (let i = 0; i < events.length; i++) events[i].pause()
    }

    resume() {
        this.hallPausedEvents.forEach(eventName => {
            if (this.events[eventName]) this.events[eventName].resume()
        })
        this.hallPausedEvents = []
    }
}
