import type { LobbyRecordV2 } from './types'
import { nowIso } from './time'

const ROOM_STORAGE_KEY = 'lobby.v2'

export class LobbyRepository {
    constructor(private readonly storage: DurableObjectStorage) {}

    async deleteAll(): Promise<void> {
        await this.storage.deleteAll()
    }

    async get(): Promise<LobbyRecordV2 | null> {
        return (await this.storage.get<LobbyRecordV2>(ROOM_STORAGE_KEY)) || null
    }

    async put(record: LobbyRecordV2): Promise<void> {
        record.lobby.updatedAt = nowIso()
        await this.storage.put(ROOM_STORAGE_KEY, record)
    }
}
