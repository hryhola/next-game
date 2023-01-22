import { v4 } from 'uuid'
import { RestHandlers, WrapperHTTPHandler } from 'uWebSockets/uws.types'

type PostRequest = {
    imageResId: string
    nickname: string
    token: string
}

const post: WrapperHTTPHandler<PostRequest> = state => async (res, req) => {
    res.json({
        success: true,
        lobbyId: v4()
    })

    // const data = await req.body

    // if (fields.lobbyId in state.lobbies) {
    //     return res.status(400).json({
    //         success: false,
    //         message: 'Room already exists',
    //         lobbyId: fields.lobbyId
    //     })
    // }

    // const user = state.users.find(u => u.nickname === fields.creatorId)!

    // if (!user) {
    //     return res.status(500).json({
    //         success: false,
    //         message: 'Cannot find user with such nickname',
    //         lobbyId: fields.lobbyId
    //     })
    // }

    // const lobby = new Jeopardy(fields.lobbyId, user, fields.password)

    // state.lobbies[lobby.id] = lobby

    // return res.status(200).json({
    //     success: true,
    //     lobby: lobby.id
    // })
}

export const handlers: RestHandlers = {
    post
}
