import { buildBasicAuthHeader, matchesBasicAuthHeader, parseBasicAuthHeader } from './basicAuth'

describe('basic auth helpers', () => {
    it('builds and parses a valid basic auth header', () => {
        const header = buildBasicAuthHeader({
            password: 'secret-pass',
            username: 'admin-user'
        })

        expect(parseBasicAuthHeader(header)).toEqual({
            password: 'secret-pass',
            username: 'admin-user'
        })
    })

    it('rejects malformed headers', () => {
        expect(parseBasicAuthHeader(null)).toBeNull()
        expect(parseBasicAuthHeader('Bearer abc')).toBeNull()
        expect(parseBasicAuthHeader('Basic !!!not-base64!!!')).toBeNull()
        expect(parseBasicAuthHeader(`Basic ${Buffer.from('no-separator', 'utf8').toString('base64')}`)).toBeNull()
    })

    it('matches only the exact expected credentials', () => {
        const header = buildBasicAuthHeader({
            password: 'secret-pass',
            username: 'admin-user'
        })

        expect(
            matchesBasicAuthHeader(header, {
                password: 'secret-pass',
                username: 'admin-user'
            })
        ).toBe(true)
        expect(
            matchesBasicAuthHeader(header, {
                password: 'wrong-pass',
                username: 'admin-user'
            })
        ).toBe(false)
    })
})
