import { WebSocket } from 'uWebSockets.js'

export interface GlobalOnlineUpdate {
    onlineUsersCount: number
}

export interface GlobalChatMessage {
    message: ChatMessage
}

export interface AbstractSocketMessage<Ctx extends string = string, Data extends Object = {}> {
    ctx: Ctx
    data: Data
}

export type ResponseActions = {
    publish(channel: string, message: AbstractSocketMessage): void
    res<T>(data: T): void
    send<T>(ctx: string, data: T): void
    ws: WebSocket
}

export type Handler<RequestData extends Object | null = null> = (res: ResponseActions, data: RequestData) => void
