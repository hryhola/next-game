import { TChatMessage, User } from 'state'

export type GlobalPublishedEvents = {
    'GlobalChat-NewMessage': {
        message: TChatMessage
    }
    'GlobalOnline-UsersUpdate': {
        users: Pick<User, 'nickname'>[]
    }
    'GlobalOnline-UsersCountUpdate': {
        onlineUsersCount: number
    }
}

export type GlobalEventName = keyof GlobalPublishedEvents
