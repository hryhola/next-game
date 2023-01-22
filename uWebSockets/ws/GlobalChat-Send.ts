import { Handler } from 'uWebSockets/uws.types'
import { TChatMessage } from 'state'

export interface Request {
    message: TChatMessage
}

export const handler: Handler<Request> = (actions, state, data) => {
    state.globalChat.addMessage(data.message)
}
