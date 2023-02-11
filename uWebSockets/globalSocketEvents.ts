import { TChatMessage } from 'state'
import { GetUsersSuccess } from './ws/Users-Get'

export type GlobalPublishedEvents = {
    'Chat-NewMessage': {
        scope: 'global' | 'lobby'
        lobbyId?: string
        message: TChatMessage
    }
    'UserRegistry-OnlineUpdate': {
        scope: 'global'
        list: { nickname: string }[]
    }
}

export type GlobalEventName = keyof GlobalPublishedEvents
