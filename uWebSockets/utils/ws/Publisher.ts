import { TemplatedApp } from 'uWebSockets.js'
import { WSEvents } from 'uWebSockets/globalSocketEvents'
import { AbstractSocketMessage } from 'uWebSockets/uws.types'
import { WSMessageResponseActions } from './wrappers'

class Publisher {
    app: TemplatedApp

    constructor(app: TemplatedApp) {
        this.app = app
    }

    publish(channel: string, publishMessage: AbstractSocketMessage) {
        WSMessageResponseActions.prototype.publish.call({ app: this.app }, channel, publishMessage)
    }

    publishGlobal<T extends keyof WSEvents>(channelCtx: T, data: WSEvents[T]) {
        WSMessageResponseActions.prototype.publishGlobal.call({ app: this.app }, channelCtx, data)
    }
}

export default Publisher
