import { StateEventName } from 'uWebSockets/topicEvents'
import { Handler } from '../uws.types'
import logger from 'logger'

export type Request = {
    mode: 'subscribe' | 'unsubscribe'
} & (
    | {
          topic: StateEventName
          scope: 'global'
      }
    | {
          lobbyId: string
          topic: string
      }
)

export const handler: Handler<Request> = (act, state, data) => {
    const id = 'lobbyId' in data ? `Lobby-${data.lobbyId}` : data.topic

    if (data.mode === 'subscribe') {
        logger.info('subscribed to: ' + id)

        act.ws.subscribe(id)
    } else if (data.mode === 'unsubscribe') {
        logger.info('unsubscribed from: ' + id)

        act.ws.unsubscribe(id)
    } else {
        logger.error(data, 'Unknown subscription mode')
    }
}
