export interface RealtimeConnection {
    send(message: string): void
    subscribe(channel: string): void
    unsubscribe(channel: string): void
    matches(connection: unknown): boolean
}
