import { WebSocket } from 'uWebSockets.js'

export type PublishContext = 'globalOnline'

export interface AbstractSocketMessage<Ctx extends string = string, Data extends Object = {}> {
    ctx: Ctx
    data: Data
}

export type Res = {
    send: <Data>(data: Data) => void
    publish: (ctx: PublishContext, data: AbstractSocketMessage<string, any>) => void
    ws: WebSocket
}

export type Handler<RequestData extends Object> = (res: Res, data: RequestData) => void
