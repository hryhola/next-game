export interface SocketMessage<Ctx extends string = string, Data extends null | {} = null | {}> {
    ctx: Ctx
    token?: string
    data: Data
}
