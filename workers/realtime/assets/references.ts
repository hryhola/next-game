import type { RealtimeLobbySnapshot } from '../../../shared/contracts/realtime-lobby'

export function extractAssetIdFromUrl(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()

    if (!trimmed) {
        return null
    }

    try {
        const url = new URL(trimmed, 'https://assets.internal')
        const match = url.pathname.match(/^\/assets\/([^/]+)\/?$/)

        return match ? decodeURIComponent(match[1]) : null
    } catch (_error) {
        return null
    }
}

export function getReferencedAssetIdsFromLobbySnapshot(snapshot: RealtimeLobbySnapshot): string[] {
    const assetIds = new Set<string>()
    const gameConfig = snapshot.game.config as Record<string, unknown>
    const packConfig = gameConfig.pack as { value?: unknown } | undefined

    if (packConfig && typeof packConfig === 'object') {
        const packAssetId = extractAssetIdFromUrl(typeof packConfig.value === 'string' ? packConfig.value : undefined)

        if (packAssetId) {
            assetIds.add(packAssetId)
        }
    }

    const backgroundAssetId = extractAssetIdFromUrl(typeof gameConfig.backgroundUrl === 'string' ? gameConfig.backgroundUrl : undefined)

    if (backgroundAssetId) {
        assetIds.add(backgroundAssetId)
    }

    return Array.from(assetIds)
}
