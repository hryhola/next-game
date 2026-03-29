export interface RealtimeWorkerEnv {
    ASSETS_BUCKET: R2Bucket
    GLOBAL_PRESENCE: DurableObjectNamespace
    IDENTITY_DB: D1Database
    LOBBY_ROOMS: DurableObjectNamespace
}
