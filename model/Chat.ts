import { User } from 'model'

export interface IChatMessage {
    id: string
    username: string
    text: string
}

export interface IChat {
    onlineUsers: User[]
    messages: IChatMessage[]
}

export class Chat implements IChat {
    onlineUsers: User[] = []
    messages: IChatMessage[] = []
}
