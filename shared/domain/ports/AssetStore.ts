export type AssetOwnerType = 'lobby' | 'user'
export type AssetVisibility = 'public'

export interface StoredAsset {
    contentType: string
    createdAt: string
    fileName: string
    id: string
    kind: string
    ownerId: string
    ownerType: AssetOwnerType
    size: number
    url: string
    visibility: AssetVisibility
}

export interface CreateAssetInput {
    body: ArrayBuffer | ArrayBufferView | ReadableStream
    contentType: string
    fileName: string
    kind: string
    ownerId: string
    ownerType: AssetOwnerType
    size: number
    uploadedByUserId?: string
    visibility?: AssetVisibility
}

export interface AssetStore {
    delete(assetId: string): Promise<void>
    getPublic(assetId: string): Promise<StoredAsset | null>
    listActiveByOwner(ownerType: AssetOwnerType, ownerId: string, kind?: string): Promise<StoredAsset[]>
    put(input: CreateAssetInput): Promise<StoredAsset>
}
