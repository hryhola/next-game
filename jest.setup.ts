import '@testing-library/jest-dom'

class TestResizeObserver implements ResizeObserver {
    observe(): void {}

    unobserve(): void {}

    disconnect(): void {}
}

if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = TestResizeObserver as typeof ResizeObserver
}

if (typeof HTMLMediaElement !== 'undefined') {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
        configurable: true,
        value: jest.fn().mockResolvedValue(undefined)
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
        configurable: true,
        value: jest.fn()
    })
}
