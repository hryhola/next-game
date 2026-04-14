import type { RealtimeLobbySnapshot } from '../../../shared/contracts/realtime-lobby'
import { extractAssetIdFromUrl, getReferencedAssetIdsFromLobbySnapshot } from './references'

describe('asset references', () => {
    it('extracts asset ids from absolute and relative worker asset urls', () => {
        expect(extractAssetIdFromUrl('https://example.com/assets/asset-123')).toBe('asset-123')
        expect(extractAssetIdFromUrl('/assets/asset-456')).toBe('asset-456')
    })

    it('returns null for values that do not point at worker assets', () => {
        expect(extractAssetIdFromUrl('https://example.com/not-assets/asset-123')).toBeNull()
        expect(extractAssetIdFromUrl('')).toBeNull()
        expect(extractAssetIdFromUrl(undefined)).toBeNull()
    })

    it('collects jeopardy pack asset ids from the lobby snapshot', () => {
        const snapshot: RealtimeLobbySnapshot = {
            chat: [],
            createdAt: '2026-04-14T09:00:00.000Z',
            creatorUserId: 'user-1',
            game: {
                config: {
                    pack: {
                        public: true,
                        value: 'https://example.com/assets/pack-asset'
                    }
                },
                kind: 'Jeopardy',
                name: 'Jeopardy',
                participants: [],
                session: null,
                status: 'waiting'
            },
            hasPassword: false,
            lobbyId: 'lobby-1',
            members: [],
            name: 'Jeopardy Lobby',
            readyCheck: {
                participants: [],
                status: 'idle',
                updatedAt: null,
                votes: {}
            },
            updatedAt: '2026-04-14T09:00:00.000Z',
            version: 2
        }

        expect(getReferencedAssetIdsFromLobbySnapshot(snapshot)).toEqual(['pack-asset'])
    })

    it('collects clicker background asset ids from the lobby snapshot', () => {
        const snapshot: RealtimeLobbySnapshot = {
            chat: [],
            createdAt: '2026-04-14T09:00:00.000Z',
            creatorUserId: 'user-1',
            game: {
                config: {
                    backgroundUrl: '/assets/background-asset'
                },
                kind: 'Clicker',
                name: 'Clicker',
                participants: [],
                session: null,
                status: 'waiting'
            },
            hasPassword: false,
            lobbyId: 'lobby-2',
            members: [],
            name: 'Clicker Lobby',
            readyCheck: {
                participants: [],
                status: 'idle',
                updatedAt: null,
                votes: {}
            },
            updatedAt: '2026-04-14T09:00:00.000Z',
            version: 2
        }

        expect(getReferencedAssetIdsFromLobbySnapshot(snapshot)).toEqual(['background-asset'])
    })
})
