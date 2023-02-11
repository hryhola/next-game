import { RestHandlers, WrapperHTTPHandler } from 'uWebSockets/uws.types'

type PostRequest = {
    imageResId: string
    nickname: string
    token: string
}

const post: WrapperHTTPHandler<PostRequest> =
    ({ users }) =>
    async (res, req) => {
        const data = await req.body

        const user = users.getByToken(data.token)!

        user.update({
            nickname: data.nickname,
            avatarUrl: data.imageResId
        })

        res.json({
            success: true
        })
    }

const get: WrapperHTTPHandler =
    ({ users }) =>
    async (res, req) => {
        const data = req.query as { token?: string }

        if (!data.token) {
            return res.json({
                success: false,
                message: 'Token missing'
            })
        }

        const user = users.getByToken(data.token)

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
