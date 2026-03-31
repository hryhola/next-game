import { decodeHeaderValue, encodeHeaderValue } from './headerEncoding'

describe('header encoding', () => {
    it('round-trips unicode safely through ASCII-only header values', () => {
        const original = 'Привіт 🚀 / next-game'
        const encoded = encodeHeaderValue(original)

        expect(encoded).toMatch(/^x-next-game-v1:/)
        expect(() => new Headers({ 'x-test': encoded })).not.toThrow()
        expect(decodeHeaderValue(encoded)).toBe(original)
    })

    it('keeps legacy plain ASCII headers readable during a mixed rollout', () => {
        expect(decodeHeaderValue('plain-ascii')).toBe('plain-ascii')
    })

    it('treats malformed encoded headers as missing', () => {
        expect(decodeHeaderValue('x-next-game-v1:%E0%A4%A')).toBeNull()
    })
})
