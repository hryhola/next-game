import { HttpRequest, HttpResponse } from 'uWebSockets.js'

export class ResWrapper {
    uReq: HttpRequest
    uRes: HttpResponse

    constructor(req: HttpRequest, res: HttpResponse) {
        this.uReq = req
        this.uRes = res
    }

    status(value: string) {
        this.uRes.writeStatus(value)

        return this
    }

    json(data: any) {
        this.uRes.writeHeader('Content-Type', 'application/json')
        this.uRes.end(JSON.stringify(data))
    }
}
