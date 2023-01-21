import { state } from 'state'
import { RestHandlers, WrapperHTTPHandler } from 'uWebSockets/uws.types'

type PostRequest = {
    imageResId: string
    nickname: string
    token: string
}

const post: WrapperHTTPHandler<PostRequest> = async (res, req) => {
    const data = await req.body

    const user = state.auth[data.token]

    user.nickname = data.nickname
    user.avatarRes = data.imageResId

    res.json({
        success: true
    })
}

const get: WrapperHTTPHandler = async (res, req) => {
    const data = req.query as { token?: string }

    if (!data.token) {
        return res.json({
            success: false,
            message: 'Token missing'
        })
    }

    const user = state.auth[data.token]

    if (!user) {
        return res.json({
            success: false,
            message: 'Invalid token'
        })
    }

    return res.json({
        success: true,
        user
    })
}

export const handlers: RestHandlers = {
    post,
    get
}
