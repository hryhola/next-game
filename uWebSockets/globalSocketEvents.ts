import { TChatMessage, User } from 'state'
import { GetUsersSuccess } from './ws/Users-Get'
import { GetUsersCountSuccess } from './ws/Users-GetCount'

export type GlobalPublishedEvents = {
    'Chat-NewMessage': {
        scope: 'global' | 'lobby'
        lobbyId?: string
        message: TChatMessage
    }
    'Universal-UsersUpdate': GetUsersSuccess
    'Universal-UsersCountUpdate': GetUsersCountSuccess
}

export type GlobalEventName = keyof GlobalPublishedEvents
