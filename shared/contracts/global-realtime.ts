import type { PresenceSnapshot } from './identity'
import type { RealtimeChatMessage, RealtimeLobbyListItem } from './realtime-lobby'

export interface GlobalRealtimePresenceSnapshotMessage {
    payload: PresenceSnapshot
    type: 'presence.snapshot'
}

export interface GlobalRealtimeChatSnapshotMessage {
    payload: {
        messages: RealtimeChatMessage[]
    }
    type: 'global.chat.snapshot'
}

export interface GlobalRealtimeChatMessage {
    payload: RealtimeChatMessage
    type: 'global.chat.message'
}

export interface GlobalRealtimeLobbiesUpdatedMessage {
    payload: {
        lobbies: RealtimeLobbyListItem[]
    }
    type: 'global.lobbies.updated'
}

export interface GlobalRealtimePongMessage {
    type: 'pong'
}

export type GlobalRealtimeServerMessage =
    | GlobalRealtimeChatMessage
    | GlobalRealtimeChatSnapshotMessage
    | GlobalRealtimeLobbiesUpdatedMessage
    | GlobalRealtimePongMessage
    | GlobalRealtimePresenceSnapshotMessage
