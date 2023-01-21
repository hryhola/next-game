import logger from 'logger'
import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { WrapperHTTPHandler } from 'uWebSockets/uws.types'
import { ReqWrapper } from './req-wrapper'
import { ResWrapper } from './res-wrapper'

export const createHandlerWrapper =
    (handler: WrapperHTTPHandler<any, any>, route: string, method: string) => (nativeRes: HttpResponse, nativeReq: HttpRequest) => {
        const reqWrapper = new ReqWrapper(nativeReq, nativeRes)
        const resWrapper = new ResWrapper(nativeReq, nativeRes)

        logger.info(`HTTP request to WS server: ${method}\t${route}`)

        handler(resWrapper, reqWrapper)
    }
