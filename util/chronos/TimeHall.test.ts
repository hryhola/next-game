import { TimeHall } from './TimeHall'
import { DelayedEvent } from './DelayedEvent'

jest.mock('./DelayedEvent', () => {
    return {
        DelayedEvent: jest.fn().mockImplementation(() => {
            return {
                start: jest.fn(),
                pause: jest.fn(),
                resume: jest.fn(),
                resolve: jest.fn(),
                isPaused: false,
                completion: Promise.resolve()
            }
        })
    }
})

describe('TimeHall', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createEvent', () => {
        it('should create a new DelayedEvent and store it', () => {
            const timeHall = new TimeHall()
            const event = timeHall.createEvent('event1', 10)

            expect(DelayedEvent).toHaveBeenCalledTimes(1)
            expect(DelayedEvent).toHaveBeenCalledWith(10, expect.any(Function))
            expect(timeHall['events']).toHaveProperty('event1', event)
        })
    })

    describe('startEvent', () => {
        it('should start the specified event', () => {
            const timeHall = new TimeHall()
            const event = {
                start: jest.fn()
            }
            timeHall['events']['event1'] = event as any

            timeHall.startEvent('event1')

            expect(event.start).toHaveBeenCalledTimes(1)
        })

        it('should throw an error if the event is not found', () => {
            const timeHall = new TimeHall()

            expect(() => timeHall.startEvent('event1')).toThrowError('Event "event1" not found')
        })
    })

    describe('createAndStartEvent', () => {
        it('should create and start a new DelayedEvent', () => {
            const timeHall = new TimeHall()
            const event = {
                start: jest.fn()
            }
            ;(DelayedEvent as jest.Mock).mockImplementationOnce(() => event as any)

            const createdEvent = timeHall.createAndStartEvent('event1', 10)

            expect(DelayedEvent).toHaveBeenCalledTimes(1)
            expect(DelayedEvent).toHaveBeenCalledWith(10, expect.any(Function))
            expect(createdEvent).toBe(event)
            expect(event.start).toHaveBeenCalledTimes(1)
            expect(timeHall['events']).toHaveProperty('event1', event)
        })
    })

    describe('cancelEvent', () => {
        it('should stop and delete the specified event', () => {
            const timeHall = new TimeHall()
            const event = {
                stop: jest.fn()
            }
            timeHall['events']['event1'] = event as any

            timeHall.cancelEvent('event1')

            expect(event.stop).toHaveBeenCalledTimes(1)
            expect(timeHall['events']).not.toHaveProperty('event1')
        })

        it('should not throw an error if the event is not found', () => {
            const timeHall = new TimeHall()

            expect(() => timeHall.cancelEvent('event1')).not.toThrowError()
        })

        it('should throw an error if the event is not found and throwNotFound is true', () => {
            const timeHall = new TimeHall()

            expect(() => timeHall.cancelEvent('event1', true)).toThrowError('Event "event1" not found')
        })
    })

    describe('resolveEvent', () => {
        it('should resolve the specified event', () => {
            const timeHall = new TimeHall()
            const event = {
                resolve: jest.fn()
            }
            timeHall['events']['event1'] = event as any

            timeHall.resolveEvent('event1')

            expect(event.resolve).toHaveBeenCalledTimes(1)
        })

        it('should throw an error if the event is not found', () => {
            const timeHall = new TimeHall()

            expect(() => timeHall.resolveEvent('event1')).toThrowError('Event "event1" not found')
        })
    })
})
