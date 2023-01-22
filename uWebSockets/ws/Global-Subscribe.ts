import { GlobalEventName } from 'uWebSockets/globalSocketEvents'
import { Handler } from '../uws.types'
import logger from 'logger'

export interface Request {
    topic: GlobalEventName
}

export const handler: Handler<Request> = (actions, state, data) => {
    logger.info('subscribed to: ' + data.topic)

    actions.ws.subscribe(data.topic)
}
