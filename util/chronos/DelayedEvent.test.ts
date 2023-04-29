import { DelayedEvent } from './DelayedEvent'

describe('DelayedEvent E2E', () => {
    it('should execute the callback after the specified delay', async () => {
        const callback = jest.fn()
        const event = new DelayedEvent(1, callback)
        event.start()
        await event.completion
        expect(callback).toBeCalled()
    })

    it('should pause and resume correctly', async () => {
        const callback = jest.fn()
        const event = new DelayedEvent(2, callback)
        event.start()
        await new Promise(r => setTimeout(r, 1000))
        event.pause()
        await new Promise(r => setTimeout(r, 1000))
        expect(callback).not.toBeCalled()
        event.resume()
        await event.completion
        expect(callback).toBeCalled()
    })

    it('should throw an error when trying to pause a non-started event', () => {
        const event = new DelayedEvent(2)
        expect(() => event.pause()).toThrowError('Cannot pause a DelayedEvent that has not been started')
    })

    it('should throw an error when trying to resume a non-paused event', () => {
        const event = new DelayedEvent(2)
        expect(() => event.resume()).toThrowError('Cannot resume a DelayedEvent that is not paused')
    })
})
