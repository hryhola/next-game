import { Handler } from '../uws.types'

export interface SubscribeRequest {
    topic: string
}

export const handler: Handler<SubscribeRequest> = (res, data) => {
    console.log('subscribed to:', data.topic)

    res.ws.subscribe(data.topic)
}
