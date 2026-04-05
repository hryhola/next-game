import { getCookie } from 'cookies-next'
import type { StoredAsset } from 'shared/domain/ports/AssetStore'
import {
    parseJeopardyPackArchive,
    validateJeopardyPackCompatibility,
    type JeopardyPackCompatibilityResult,
    type ParsedJeopardyPack
} from 'shared/lib/jeopardyPack'
import { getWorkerErrorMessage } from './realtimeAdapter'
import { getCloudflareRealtimeApiUrl } from './realtimeMode'

const JEOPARDY_UPLOAD_PART_SIZE_BYTES = 8 * 1024 * 1024

type PreparedJeopardyPackUpload = {
    assetId: string
    bucketKey: string
    contentType: string
    fileName: string
    kind: 'jeopardy-pack'
    ownerId: string
    ownerType: 'lobby'
    size: number
    uploadId: string
    uploadedByUserId?: string
    visibility: 'public'
}

type UploadedPart = {
    etag: string
    partNumber: number
}

function createWorkerAuthHeaders(contentType: 'json' | null = 'json'): Headers {
    const headers = new Headers()
    const token = getCookie('token')

    if (contentType === 'json') {
        headers.set('content-type', 'application/json')
    }

    if (typeof token === 'string' && token.length) {
        headers.set('authorization', `Bearer ${token}`)
    }

    return headers
}

async function uploadJeopardyPackPart(upload: PreparedJeopardyPackUpload, partNumber: number, chunk: Blob): Promise<UploadedPart> {
    const response = await fetch(
        getCloudflareRealtimeApiUrl(
            `/jeopardy/packs/uploads/${encodeURIComponent(upload.uploadId)}/parts/${partNumber}?key=${encodeURIComponent(upload.bucketKey)}`
        ),
        {
            body: chunk,
            headers: createWorkerAuthHeaders(null),
            method: 'PUT'
        }
    )

    if (!response.ok) {
        throw new Error(await getWorkerErrorMessage(response, 'Failed to upload Jeopardy pack part'))
    }

    const body = (await response.json()) as {
        part?: UploadedPart
    }

    if (!body.part?.etag || typeof body.part.partNumber !== 'number') {
        throw new Error('Jeopardy upload part response is not valid')
    }

    return body.part
}

async function abortJeopardyPackUpload(upload: PreparedJeopardyPackUpload): Promise<void> {
    await fetch(getCloudflareRealtimeApiUrl(`/jeopardy/packs/uploads/${encodeURIComponent(upload.uploadId)}?key=${encodeURIComponent(upload.bucketKey)}`), {
        headers: createWorkerAuthHeaders(null),
        method: 'DELETE'
    }).catch(() => undefined)
}

export async function parseJeopardyPackFile(file: File): Promise<ParsedJeopardyPack> {
    return parseJeopardyPackArchive(await file.arrayBuffer())
}

export async function validateJeopardyPackFile(file: File): Promise<{
    compatibility: JeopardyPackCompatibilityResult
    parsedPack: ParsedJeopardyPack
}> {
    const parsedPack = await parseJeopardyPackFile(file)

    return {
        compatibility: validateJeopardyPackCompatibility(parsedPack.declaration),
        parsedPack
    }
}

export async function uploadJeopardyPackFile(file: File, lobbyId: string): Promise<StoredAsset> {
    let upload: PreparedJeopardyPackUpload | null = null
    let uploadFinalized = false

    try {
        const startResponse = await fetch(getCloudflareRealtimeApiUrl('/jeopardy/packs/uploads'), {
            body: JSON.stringify({
                contentType: file.type || 'application/octet-stream',
                fileName: file.name,
                lobbyId,
                size: file.size
            }),
            headers: createWorkerAuthHeaders(),
            method: 'POST'
        })

        if (!startResponse.ok) {
            throw new Error(await getWorkerErrorMessage(startResponse, 'Failed to start Jeopardy pack upload'))
        }

        const startBody = (await startResponse.json()) as {
            upload?: PreparedJeopardyPackUpload
        }

        if (!startBody.upload) {
            throw new Error('Jeopardy upload session is not valid')
        }

        upload = startBody.upload

        const uploadedParts: UploadedPart[] = []
        const totalParts = Math.ceil(file.size / JEOPARDY_UPLOAD_PART_SIZE_BYTES)

        for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
            const start = partIndex * JEOPARDY_UPLOAD_PART_SIZE_BYTES
            const end = Math.min(start + JEOPARDY_UPLOAD_PART_SIZE_BYTES, file.size)
            const chunk = file.slice(start, end)

            uploadedParts.push(await uploadJeopardyPackPart(upload, partIndex + 1, chunk))
        }

        const completeResponse = await fetch(getCloudflareRealtimeApiUrl(`/jeopardy/packs/uploads/${encodeURIComponent(upload.uploadId)}/complete`), {
            body: JSON.stringify({
                upload,
                uploadedParts
            }),
            headers: createWorkerAuthHeaders(),
            method: 'POST'
        })

        if (!completeResponse.ok) {
            throw new Error(await getWorkerErrorMessage(completeResponse, 'Failed to finalize Jeopardy pack upload'))
        }

        const completeBody = (await completeResponse.json()) as {
            asset?: StoredAsset
        }

        if (!completeBody.asset) {
            throw new Error('Jeopardy upload completion response is not valid')
        }

        uploadFinalized = true

        return completeBody.asset
    } catch (error) {
        if (upload && !uploadFinalized) {
            await abortJeopardyPackUpload(upload)
        }

        throw error
    }
}
