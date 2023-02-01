import { Handler } from '../uws.types'
import { TUser, User } from 'state'
import logger from 'logger'

export interface Request {
    nickname: string
}

export interface Success {
    success: true
    user: TUser
    token: string
}

export interface Failure {
    success: false
    nickname: string
    message: string
}

export const handler: Handler<Request, Success | Failure> = (actions, state, data) => {
    const existingUser = state.users.getByNickname(data.nickname)

    if (existingUser?.online) {
        return actions.res({
            success: false,
            nickname: data.nickname,
            message: 'User exists'
        })
    } else if (existingUser) {
        state.users.destroy(existingUser.token)
    }

    const user = state.users.createUser(data.nickname, actions.ws)

    logger.info('New login: ' + user.nickname)

    actions.res({
        success: true,
        user,
        token: user.token
    })
}
