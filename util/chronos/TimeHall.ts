import { DelayedEvent } from './DelayedEvent'

export class TimeHall {
    private events: Map<string, DelayedEvent>

    constructor() {
        this.events = new Map()
    }

    createEvent(name: string, delayInSeconds: number, callback?: () => void): DelayedEvent {
        const event = new DelayedEvent(delayInSeconds, callback)
        this.events.set(name, event)
        return event
    }

    startEvent(name: string): void {
        const event = this.events.get(name)
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

    pauseEvent(name: string): void {
        const event = this.events.get(name)
        if (!event) {
            throw new Error(`Event "${name}" not found`)
        }
        event.pause()
    }

    resumeEvent(name: string): void {
        const event = this.events.get(name)
        if (!event) {
            throw new Error(`Event "${name}" not found`)
        }
        event.resume()
    }
}
