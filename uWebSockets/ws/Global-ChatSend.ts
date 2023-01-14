import { Handler } from 'uWebSockets/uws.types'
import { state } from 'state'
import { TChatMessage } from 'model'

export interface Request {
    message: TChatMessage
}

export const handler: Handler<Request> = (actions, data) => {
    state.globalChat.messages.push(data.message)

    state.globalChat.messages = state.globalChat.messages.slice(-1000)

    actions.publishGlobal('GlobalChat-NewMessage', {
        message: data.message
    })
}
