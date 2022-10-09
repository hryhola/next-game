import { TChatMessage } from 'model'

export const topics = Object.freeze({
    globalOnlineUpdate: 'globalOnlineUpdate',
    globalChatMessageUpdate: 'globalChatMessageUpdate',
    'Auth-Login': 'Auth-Login',
    'Global-ChatGet': 'Global-ChatGet',
    'Lobby-Create': 'Lobby-Create',
    'Lobby-GetList': 'Lobby-GetList'
})

export type TopicEventData = {
    globalOnlineUpdate: {
        onlineUsersCount: number
    }
    globalChatMessageUpdate: {
        message: TChatMessage
    }
    'Auth-Login': import('uws/api/Auth-Login').Success | import('uws/api/Auth-Login').Failure
    'Global-ChatGet': {
        messages: TChatMessage[]
    }
    'Lobby-GetList': import('uws/api/Lobby-GetList').Success
    'Lobby-Create': import('uws/api/Lobby-Create').Success | import('uws/api/Lobby-Create').Failure
}
