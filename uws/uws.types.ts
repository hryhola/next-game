import { WebSocket } from 'uWebSockets.js'

export type Channel = 'globalOnline'

export interface GlobalOnlineUpdate {
    onlineUsersCount: number
}

export interface AbstractSocketMessage<Ctx extends string = string, Data extends Object = {}> {
    ctx: Ctx
    data: Data
}

export type Res = {
    send: <Data>(data: Data) => void
    publish: (channel: Channel, data: AbstractSocketMessage<string, any>) => void
    ws: WebSocket
}

export type Handler<RequestData extends Object | null = null> = (res: Res, data: RequestData) => void
