import { Handler } from '../uws.types'
import { TChatMessage } from 'state'

export interface Success {
    messages: TChatMessage[]
}

export const handler: Handler<null, Success> = (actions, state) => {
    actions.res({
        messages: state.globalChat.messages.slice(-50).reverse()
    })
}
