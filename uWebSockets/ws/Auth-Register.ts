import { Handler } from '../uws.types'
import { UserData, User } from 'state'
import logger from 'logger'

export interface Request {
    nickname: string
}

export interface Success {
    success: true
    user: UserData
    token: string
}

export interface Failure {
    success: false
    nickname: string
    message: string
}

export const handler: Handler<Request, Success | Failure> = (act, state, data) => {
    const existingUser = state.users.getByNickname(data.nickname)

    if (existingUser?.state.isOnline) {
        return act.res({
            success: false,
            nickname: data.nickname,
            message: 'User exists'
        })
    } else if (existingUser) {
        state.users.destroy(existingUser.token)
    }

    const user = state.users.register(data.nickname, act.ws)

    logger.info('New login: ' + user.state.nickname)

    act.res({
        success: true,
        user: user.data(),
        token: user.token
    })
}
