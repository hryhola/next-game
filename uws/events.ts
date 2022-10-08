import { IChatMessage } from 'model'
import { LoginFailure, LoginSuccess } from './api/Auth-Login'

export const topics = Object.freeze({
    globalOnlineUpdate: 'globalOnlineUpdate',
    globalChatMessageUpdate: 'globalChatMessageUpdate',
    'Auth-Login': 'Auth-Login',
    'Global-ChatGet': 'Global-ChatGet'
})

export type TopicEventData = {
    globalOnlineUpdate: {
        onlineUsersCount: number
    }
    globalChatMessageUpdate: {
        message: IChatMessage
    }
    'Auth-Login': LoginSuccess | LoginFailure
    'Global-ChatGet': {
        messages: IChatMessage[]
    }
}
