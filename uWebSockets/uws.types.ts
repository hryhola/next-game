import { WebSocket } from 'uWebSockets.js'
import type { HandlerName } from 'uWebSockets/ws'
import type { GlobalPublishedEvents, GlobalEventName } from 'uWebSockets/globalSocketEvents'

export interface AbstractSocketMessage<Ctx extends string = string, Data extends null | {} = null | {}> {
    ctx: Ctx
    token?: string
    data: Data
}

export type ResponseActions<ResponseType = unknown> = {
    publish(channel: string, message: AbstractSocketMessage): void
    publishGlobal<C extends GlobalEventName>(channel: C, message: GlobalPublishedEvents[C]): void
    res(data: ResponseType): void
    send(ctx: string, data: any): void
    ws: WebSocket<unknown>
}

export type Handler<RequestData extends Object | null = null, ResponseType = any> = (
    actions: ResponseActions<ResponseType>,
    data: RequestData,
    token?: string
) => void

export type RequestData<R extends HandlerName> = Parameters<typeof import('uWebSockets/ws')['handlers'][R]>[1]
export type RequestHandler<R extends HandlerName> = (data: Parameters<Parameters<typeof import('uWebSockets/ws')['handlers'][R]>[0]['res']>[0]) => void
export type GlobalEventHandler<E extends GlobalEventName> = (data: GlobalPublishedEvents[E]) => void
