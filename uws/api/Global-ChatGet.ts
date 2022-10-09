import { Handler } from '../uws.types'
import { TopicEventData } from '../events'
import { state } from '../../state'

export const handler: Handler = res => {
    res.res<'Global-ChatGet'>({
        messages: state.globalChat.messages.slice(-50).reverse()
    })
}
