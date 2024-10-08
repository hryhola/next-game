import { WebSocket, HttpResponse, HttpRequest } from 'uWebSockets.js'
import type { HandlerName } from 'uWebSockets/ws'
import type { StateEvents, StateEventName } from 'uWebSockets/topicEvents'
import queryString from 'query-string'
import { State } from 'state'

export interface SocketMessage<Ctx extends string = string, Data extends null | {} = null | {}> {
    ctx: Ctx
    token?: string
    data: Data
}

export type ResponseActions<ResponseType = unknown> = {
    publish(channel: string, message: SocketMessage): void
    publishTopicEvent<C extends StateEventName>(channel: C, message: StateEvents[C]): void
    res(data: ResponseType): void
    send(ctx: string, data: any): void
    ws: WebSocket<unknown>
}

export type Handler<RequestData extends Object | null = null, ResponseType = any> = (
    actions: ResponseActions<ResponseType>,
    state: State,
    data: RequestData,
    token?: string
) => void

export type RequestData<R extends HandlerName> = Parameters<typeof import('uWebSockets/ws')['handlers'][R]>[2]
export type ResponseData<R extends HandlerName> = Parameters<Parameters<typeof import('uWebSockets/ws')['handlers'][R]>[0]['res']>[0]
export type RequestHandler<R extends HandlerName> = (data: ResponseData<R>) => void
export type TopicEventHandler<E extends StateEventName> = (data: StateEvents[E]) => void

export type HTTPMethod = 'get' | 'connect' | 'post' | 'options' | 'del' | 'patch' | 'put' | 'head' | 'trace'

export type NativeHTTPHandler = (res: HttpResponse, req: HttpRequest) => void | Promise<void>

export type ReqWrapper<B = null> = {
    uReq: HttpRequest
    readonly body: Promise<B>
    readonly query: queryString.ParsedQuery<string>
}

export type ResWrapper<R = {}> = {
    uRes: HttpResponse
    json: (data: R) => void
}

export type WrapperHTTPHandler<Body = any, Response = any> = (state: State) => (res: ResWrapper<Response>, req: ReqWrapper<Body>) => void | Promise<void>

export type RestHandlers = Partial<Record<HTTPMethod, WrapperHTTPHandler>>
