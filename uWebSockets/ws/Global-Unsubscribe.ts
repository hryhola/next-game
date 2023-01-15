import { GlobalEventName } from 'uWebSockets/globalSocketEvents'
import { Handler } from '../uws.types'
import logger from 'logger'

export interface Request {
    topic: GlobalEventName
}

export const handler: Handler<Request> = (actions, data) => {
    logger.info('unsubscribed from: ' + data.topic)

    actions.ws.unsubscribe(data.topic)
}
