import logger from 'logger'
import { TemplatedApp, WebSocket } from 'uWebSockets.js'
import { StateEvents } from 'uWebSockets/topicEvents'
import { SocketMessage } from 'uWebSockets/uws.types'

export class WSMessageResponseActions {
    ws: WebSocket<unknown>
    app: TemplatedApp
    request: SocketMessage

    constructor(app: TemplatedApp, ws: WebSocket<unknown>, request: SocketMessage) {
        this.app = app
        this.ws = ws
        this.request = request
    }

    publish(channel: string, publishMessage: SocketMessage) {
        const messageString = JSON.stringify(publishMessage)

        logger.info(`publishing to ${channel} ${messageString}`)

        this.app.publish(channel, messageString)
    }

    publishTopicEvent<T extends keyof StateEvents>(topic: T, data: StateEvents[T]) {
        const message: SocketMessage = {
            ctx: topic,
            data
        }

        logger.info(data, `publishing global event to ${topic}`)

        this.app.publish(topic, JSON.stringify(message))
    }

    res<T>(data: T) {
        logger.info(data, 'Responding to ' + this.request.ctx)
        this.ws.send(
            JSON.stringify({
                ctx: this.request.ctx,
                data
            })
        )
    }

    send<T>(ctx: string, data: T) {
        logger.info(data, 'Sending to ' + ctx)
        this.ws.send(
            JSON.stringify({
                ctx: ctx,
                data
            })
        )
    }
}
