import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { parseJsonBody } from '../parse'
import queryString from 'query-string'

export class ReqWrapper {
    private _body?: any
    private _query?: queryString.ParsedQuery<string>

    uReq: HttpRequest
    uRes: HttpResponse

    constructor(req: HttpRequest, res: HttpResponse) {
        this.uReq = req
        this.uRes = res
    }

    get body() {
        if (typeof this._body === 'undefined') {
            this._body = parseJsonBody(this.uRes)
        }

        return this._body
    }

    get query() {
        if (typeof this._query === 'undefined') {
            this._query = queryString.parse(this.uReq.getQuery())
        }

        return this._query
    }
}
