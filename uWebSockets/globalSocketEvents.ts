import { TChatMessage } from 'model'

export type GlobalPublishedEvents = {
    'GlobalChat-NewMessage': {
        message: TChatMessage
    }
    'Global-OnlineUpdate': {
        onlineUsersCount: number
    }
}

export type GlobalEventName = keyof GlobalPublishedEvents
