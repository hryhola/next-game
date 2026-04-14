import { api } from './api'

jest.mock('cookies-next', () => ({
    getCookie: jest.fn()
}))

jest.mock('./jeopardyPack', () => ({
    uploadJeopardyPackFile: jest.fn(),
    validateJeopardyPackFile: jest.fn()
}))

jest.mock('./realtimeAdapter', () => ({
    getWorkerErrorMessage: jest.fn(async () => 'Request failed'),
    toAppGameData: jest.fn(),
    toAppLobbyData: jest.fn()
}))

describe('api admin asset purge', () => {
    const originalFetch = global.fetch

    afterEach(() => {
        global.fetch = originalFetch
        jest.clearAllMocks()
    })

    it('normalizes ok=true responses into success=true', async () => {
        const summary = {
            deletedAssetCount: 16,
            deletedBucketObjectCount: 0,
            fallbackLobbyCount: 0,
            referencedAssetCount: 7,
            scannedBucketObjectCount: 7,
            scannedLobbyCount: 0,
            scannedUserAvatarCount: 7
        }

        global.fetch = jest.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true, summary }), {
                headers: {
                    'content-type': 'application/json'
                },
                status: 200
            })
        ) as typeof global.fetch

        const [response, error] = await api.post('admin-asset-purge', {})

        expect(error).toBeUndefined()
        expect(response).toEqual({
            success: true,
            summary
        })
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/assets/purge', {
            method: 'POST'
        })
    })
})
