import { TChatMessage, TUser } from 'model'

export type GlobalPublishedEvents = {
    'GlobalChat-NewMessage': {
        message: TChatMessage
    }
    'GlobalOnline-UsersUpdate': {
        users: TUser[]
    }
    'GlobalOnline-UsersCountUpdate': {
        onlineUsersCount: number
    }
}

export type GlobalEventName = keyof GlobalPublishedEvents
