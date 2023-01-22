import { RestHandlers, WrapperHTTPHandler } from 'uWebSockets/uws.types'

export interface PostRequest {
    token: string
}

const post: WrapperHTTPHandler<PostRequest> = state => async (res, req) => {
    const data = await req.body

    const isValid = typeof state.users.auth(data.token) !== 'undefined'

    res.json({
        isValid
    })
}

export const handlers: RestHandlers = {
    post
}
