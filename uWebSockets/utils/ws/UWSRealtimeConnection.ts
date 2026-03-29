import { WebSocket } from 'uWebSockets.js'
import type { RealtimeConnection } from 'shared/domain'

export class UWSRealtimeConnection implements RealtimeConnection {
    constructor(private readonly ws: WebSocket<unknown>) {}

    send(message: string): void {
        this.ws.send(message)
    }

    subscribe(channel: string): void {
        this.ws.subscribe(channel)
    }

    unsubscribe(channel: string): void {
        this.ws.unsubscribe(channel)
    }

    matches(connection: unknown): boolean {
        if (connection instanceof UWSRealtimeConnection) {
            return this.ws === connection.ws
        }

        return this.ws === connection
    }
}
