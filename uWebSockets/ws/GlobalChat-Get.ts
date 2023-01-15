import { Handler } from '../uws.types'
import { state } from '../../state'
import { TChatMessage } from 'model'

export interface Success {
    messages: TChatMessage[]
}

export const handler: Handler<null, Success> = actions => {
    actions.res({
        messages: state.globalChat.messages.slice(-50).reverse()
    })
}
