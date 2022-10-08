import { GlobalChatMessage, Handler } from 'uws/uws.types'
import { state } from 'state'
import { topics } from '../events'

export const handler: Handler<GlobalChatMessage> = (res, data) => {
    state.globalChat.messages.push(data.message)

    state.globalChat.messages = state.globalChat.messages.slice(-1000)

    res.publish(topics.globalChatMessageUpdate, {
        ctx: topics.globalChatMessageUpdate,
        data: {
            message: data.message
        } as GlobalChatMessage
    })
}
