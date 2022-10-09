import { TChatMessage } from 'model'
import { WebSocket } from 'uWebSockets.js'
import { HandlerName } from 'uws/api'
import { TopicEventData } from './events'

export interface GlobalOnlineUpdate {
    onlineUsersCount: number
}

export interface GlobalChatMessage {
    message: TChatMessage
}

export interface AbstractSocketMessage<Ctx extends string = string, Data extends Object = {}> {
    ctx: Ctx
    data: Data
}

export type ResponseActions = {
    publish(channel: string, message: AbstractSocketMessage): void
    res<R extends keyof TopicEventData>(data: TopicEventData[R]): void
    send<T>(ctx: string, data: T): void
    ws: WebSocket
}

export type Handler<RequestData extends Object | null = null> = (res: ResponseActions, data: RequestData) => void

export type RequestData<R extends HandlerName> = Parameters<typeof import('uws/api')['default'][R]>[1]
export type RequestHandler<R extends keyof typeof import('uws/events')['topics']> = (data: import('uws/events').TopicEventData[R]) => void
