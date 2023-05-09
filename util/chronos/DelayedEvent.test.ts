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
        await new Promise(resolve => setTimeout(resolve, 1000))
        event.pause()
        await new Promise(resolve => setTimeout(resolve, 1000))
        expect(callback).not.toBeCalled()
        event.resume()
        await event.completion
        expect(callback).toBeCalled()
    })

    it('should throw an error when trying to pause a non-started event', () => {
        const event = new DelayedEvent(2)
        expect(() => event.pause()).toThrowError('Cannot pause a DelayedEvent that has is not running')
    })

    it('should execute the callback immediately if delay is zero', async () => {
        const callback = jest.fn()
        const event = new DelayedEvent(0, callback)
        event.start()
        await event.completion
        expect(callback).toBeCalled()
    })

    it('should execute the callback immediately when resolved without starting', () => {
        const callback = jest.fn()
        const event = new DelayedEvent(2, callback)
        event.resolve()
        expect(callback).toBeCalled()
    })

    it('should execute the callback only once when resolved after starting', async () => {
        const callback = jest.fn()
        const event = new DelayedEvent(2, callback)
        event.start()
        await new Promise(resolve => setTimeout(resolve, 1000))
        event.resolve()
        await new Promise(resolve => setTimeout(resolve, 1000))
        expect(callback).toBeCalledTimes(1)
    })
})
