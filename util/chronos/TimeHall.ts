import logger from 'logger'
import { DelayedEvent } from './DelayedEvent'

export class TimeHall {
    private events: Record<string, DelayedEvent>
    private hallPausedEvents: string[] = []

    constructor() {
        this.events = {}
    }

    get nonPausedEvents() {
        return Object.entries(this.events).reduce(
            (acc, [key, event]) => {
                if (!event.isPaused) {
                    acc[0].push(key)
                    acc[1].push(event)
                }
                return acc
            },
            [[], []] as [string[], DelayedEvent[]]
        )
    }

    createEvent(name: string, delayInSeconds: number, callback?: () => void): DelayedEvent {
        const event = new DelayedEvent(delayInSeconds, () => {
            delete this.events[name]

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
        const event = this.events[name]

        if (!event) {
            if (!throwNotFound) {
                return
            } else {
                throw new Error(`Event "${name}" not found`)
            }
        }

        event.pause()

        delete this.events[name]
    }

    resolveEvent(name: string) {
        const event = this.events[name]

        if (!event) {
            throw new Error(`Event "${name}" not found`)
        }

        event.resolve()
    }

    pauseEvent(name: string, throwNotFound = false): void {
        const event = this.events[name]

        if (!event) {
            if (throwNotFound) throw new Error(`Event "${name}" not found`)
            else return
        }

        event.pause()
    }

    resumeEvent(name: string, throwNotFound = false): void {
        const event = this.events[name]

        if (!event) {
            if (throwNotFound) throw new Error(`Event "${name}" not found`)
            else return
        }

        event.resume()
    }

    pause() {
        const [eventNames, events] = this.nonPausedEvents

        this.hallPausedEvents = [...this.hallPausedEvents, ...eventNames]

        for (let i = 0; i < events.length; i++) {
            try {
                events[i].pause()
            } catch (e) {
                logger.warn(e)
            }
        }
    }

    resume() {
        this.hallPausedEvents.forEach(eventName => {
            if (this.events[eventName]) {
                try {
                    this.events[eventName].resume()
                } catch (e) {
                    logger.warn(e)
                }
            }
        })
        this.hallPausedEvents = []
    }
}
