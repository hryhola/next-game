import { GlobalEventName } from 'uWebSockets/globalSocketEvents'
import { Handler } from '../uws.types'

export interface Request {
    topic: GlobalEventName
}

export const handler: Handler<Request> = (actions, data) => {
    console.log('subscribed to:', data.topic)

    actions.ws.subscribe(data.topic)
}
