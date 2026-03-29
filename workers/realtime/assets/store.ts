import type { AssetOwnerType, AssetStore, CreateAssetInput, StoredAsset } from '../../../shared/domain/ports/AssetStore'

type AssetRow = {
    assetId: string
    bucketKey: string
    contentType: string
    createdAt: string
    deletedAt: string | null
    fileName: string
    kind: string
    ownerId: string
    ownerType: AssetOwnerType
    size: number
    visibility: 'public'
}

function nowIso(): string {
    return new Date().toISOString()
}

function sanitizeFileName(fileName: string): string {
    const trimmed = fileName.trim()
    const fallback = trimmed || 'asset'

    return fallback.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset'
}

function inferExtension(fileName: string, contentType: string): string {
    const sanitizedFileName = sanitizeFileName(fileName)
    const extensionMatch = sanitizedFileName.match(/(\.[a-zA-Z0-9]+)$/)

    if (extensionMatch) {
        return extensionMatch[1].toLowerCase()
    }

    switch (contentType.toLowerCase()) {
        case 'image/jpeg':
            return '.jpg'
        case 'image/png':
            return '.png'
        case 'image/webp':
            return '.webp'
        case 'image/gif':
            return '.gif'
        case 'image/svg+xml':
            return '.svg'
        case 'application/zip':
            return '.zip'
        case 'application/json':
            return '.json'
        default:
            return ''
    }
}

function buildBucketKey(ownerType: AssetOwnerType, ownerId: string, kind: string, assetId: string, fileName: string, contentType: string): string {
    const extension = inferExtension(fileName, contentType)
    const normalizedOwnerId = ownerId.replace(/[^a-zA-Z0-9_-]+/g, '-')
    const normalizedKind = kind.replace(/[^a-zA-Z0-9_-]+/g, '-')

    return `${ownerType}/${normalizedOwnerId}/${normalizedKind}/${assetId}${extension}`
}

function toAssetUrl(baseUrl: string, assetId: string): string {
    return `${baseUrl.replace(/\/$/, '')}/assets/${assetId}`
}

function toStoredAsset(row: AssetRow, assetBaseUrl: string): StoredAsset {
    return {
        contentType: row.contentType,
        createdAt: row.createdAt,
        fileName: row.fileName,
        id: row.assetId,
        kind: row.kind,
        ownerId: row.ownerId,
        ownerType: row.ownerType,
        size: row.size,
        url: toAssetUrl(assetBaseUrl, row.assetId),
        visibility: row.visibility
    }
}

export class R2AssetStore implements AssetStore {
    constructor(private readonly db: D1Database, private readonly bucket: R2Bucket, private readonly assetBaseUrl: string) {}

    async put(input: CreateAssetInput): Promise<StoredAsset> {
        const assetId = crypto.randomUUID()
        const createdAt = nowIso()
        const fileName = sanitizeFileName(input.fileName)
        const bucketKey = buildBucketKey(input.ownerType, input.ownerId, input.kind, assetId, fileName, input.contentType)
        const visibility = input.visibility || 'public'

        await this.bucket.put(bucketKey, input.body, {
            httpMetadata: {
                cacheControl: 'public, max-age=31536000, immutable',
                contentType: input.contentType || 'application/octet-stream'
            }
        })

        await this.db
            .prepare(
                `
                    INSERT INTO assets (
                        id,
                        owner_type,
                        owner_id,
                        kind,
                        bucket_key,
                        file_name,
                        content_type,
                        size,
                        visibility,
                        uploaded_by_user_id,
                        created_at,
                        updated_at,
                        deleted_at
                    )
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, NULL)
                `
            )
            .bind(
                assetId,
                input.ownerType,
                input.ownerId,
                input.kind,
                bucketKey,
                fileName,
                input.contentType || 'application/octet-stream',
                input.size,
                visibility,
                input.uploadedByUserId || null,
                createdAt
            )
            .run()

        return {
            contentType: input.contentType || 'application/octet-stream',
            createdAt,
            fileName,
            id: assetId,
            kind: input.kind,
            ownerId: input.ownerId,
            ownerType: input.ownerType,
            size: input.size,
            url: toAssetUrl(this.assetBaseUrl, assetId),
            visibility
        }
    }

    async getPublic(assetId: string): Promise<StoredAsset | null> {
        const row = await this.getActiveRow(assetId)

        if (!row || row.visibility !== 'public') {
            return null
        }

        return toStoredAsset(row, this.assetBaseUrl)
    }

    async listActiveByOwner(ownerType: AssetOwnerType, ownerId: string, kind?: string): Promise<StoredAsset[]> {
        const query = kind
            ? `
                SELECT
                    id as assetId,
                    owner_type as ownerType,
                    owner_id as ownerId,
                    kind,
                    bucket_key as bucketKey,
                    file_name as fileName,
                    content_type as contentType,
                    size,
                    visibility,
                    created_at as createdAt,
                    deleted_at as deletedAt
                FROM assets
                WHERE owner_type = ?1
                    AND owner_id = ?2
                    AND kind = ?3
                    AND deleted_at IS NULL
                ORDER BY created_at DESC
            `
            : `
                SELECT
                    id as assetId,
                    owner_type as ownerType,
                    owner_id as ownerId,
                    kind,
                    bucket_key as bucketKey,
                    file_name as fileName,
                    content_type as contentType,
                    size,
                    visibility,
                    created_at as createdAt,
                    deleted_at as deletedAt
                FROM assets
                WHERE owner_type = ?1
                    AND owner_id = ?2
                    AND deleted_at IS NULL
                ORDER BY created_at DESC
            `

        const statement = kind ? this.db.prepare(query).bind(ownerType, ownerId, kind) : this.db.prepare(query).bind(ownerType, ownerId)
        const result = await statement.all<AssetRow>()

        return (result.results || []).map(row => toStoredAsset(row, this.assetBaseUrl))
    }

    async delete(assetId: string): Promise<void> {
        const row = await this.getActiveRow(assetId)

        if (!row) {
            return
        }

        await this.bucket.delete(row.bucketKey)

        await this.db
            .prepare(
                `
                    UPDATE assets
                    SET deleted_at = ?1, updated_at = ?1
                    WHERE id = ?2
                `
            )
            .bind(nowIso(), assetId)
            .run()
    }

    async getObjectRow(assetId: string): Promise<AssetRow | null> {
        return this.getActiveRow(assetId)
    }

    private async getActiveRow(assetId: string): Promise<AssetRow | null> {
        return (
            (await this.db
                .prepare(
                    `
                        SELECT
                            id as assetId,
                            owner_type as ownerType,
                            owner_id as ownerId,
                            kind,
                            bucket_key as bucketKey,
                            file_name as fileName,
                            content_type as contentType,
                            size,
                            visibility,
                            created_at as createdAt,
                            deleted_at as deletedAt
                        FROM assets
                        WHERE id = ?1
                            AND deleted_at IS NULL
                        LIMIT 1
                    `
                )
                .bind(assetId)
                .first<AssetRow>()) || null
        )
    }
}
