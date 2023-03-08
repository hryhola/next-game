import { TemplatedApp } from 'uWebSockets.js'
import { StateEvents } from 'uWebSockets/topicEvents'
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

    publishTopicEvent<T extends keyof StateEvents>(topic: T, data: StateEvents[T]) {
        WSMessageResponseActions.prototype.publishTopicEvent.call({ app: this.app }, topic, data)
    }
}

export default Publisher
