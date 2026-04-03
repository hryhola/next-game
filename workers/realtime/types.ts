export interface RealtimeWorkerEnv {
    ADMIN_PASSWORD: string
    ADMIN_USERNAME: string
    ASSETS_BUCKET: R2Bucket
    GLOBAL_PRESENCE: DurableObjectNamespace
    IDENTITY_DB: D1Database
    LOBBIES: DurableObjectNamespace
}
