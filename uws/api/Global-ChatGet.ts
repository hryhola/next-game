import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { TopicEventData } from '../events'
import { state } from '../../state'

export const handler: Handler = res => {
    res.res<TopicEventData['Global-ChatGet']>({
        messages: state.globalChat.slice(-20).reverse()
    })
}
