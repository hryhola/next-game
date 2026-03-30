import { createLobbySession, finalizeLobbySession, type FinalizeLobbySessionInput } from '../lobby-sessions/store'
import type { RealtimeWorkerEnv } from '../types'
import type { StartedLobbySession } from './operations'
import type { LobbyRecordV2 } from './types'

export class LobbySessionHistoryReporter {
    constructor(private readonly env: RealtimeWorkerEnv) {}

    async persistFinalized(session: FinalizeLobbySessionInput | null | undefined): Promise<void> {
        if (!session) {
            return
        }

        try {
            await finalizeLobbySession(this.env.IDENTITY_DB, session)
        } catch (error) {
            console.error('Failed to persist lobby session finalization', error)
        }
    }

    async persistStarted(record: LobbyRecordV2, session: StartedLobbySession): Promise<void> {
        try {
            await createLobbySession(this.env.IDENTITY_DB, {
                gameName: session.gameName,
                id: session.id,
                initiatedByUserId: session.initiatedByUserId,
                lobbyId: record.lobby.id,
                lobbyName: record.lobby.name,
                startedAt: session.startedAt
            })
        } catch (error) {
            console.error('Failed to persist lobby session start', error)
        }
    }
}
