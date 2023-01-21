import { state } from 'state'
import { RestHandlers, WrapperHTTPHandler } from 'uWebSockets/uws.types'

export interface PostRequest {
    token: string
}

const post: WrapperHTTPHandler<PostRequest> = async (res, req) => {
    const data = await req.body

    const isValid = data.token in state.auth

    res.json({
        isValid
    })
}

export const handlers: RestHandlers = {
    post
}
