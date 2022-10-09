import { User, TUser } from 'model'

export interface TChatMessage {
    id: string
    username: string
    text: string
}

export interface TChat {
    messages: TChatMessage[]
}

export class Chat implements TChat {
    messages: TChatMessage[] = []
}
