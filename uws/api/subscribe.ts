import { WebSocket } from 'uWebSockets.js'
import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { channel } from '../channel'

export interface SubscribeRequest {
    channel: string
}

export const subscribe: Handler<SubscribeRequest> = (res, data) => {
    console.log('subscribed to:', data.channel)

    res.ws.subscribe(data.channel)
}
