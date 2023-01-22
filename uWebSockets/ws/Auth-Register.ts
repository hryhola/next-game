import { Handler } from '../uws.types'
import { User } from 'state'
import logger from 'logger'

export interface Request {
    username: string
}

export interface Success {
    success: true
    username: string
    token: string
}

export interface Failure {
    success: false
    username: string
    message: string
}

export const handler: Handler<Request, Success | Failure> = (actions, state, data) => {
    const existingUser = state.users.getByNickname(data.username)

    if (existingUser?.isOnline()) {
        return actions.res({
            success: false,
            username: data.username,
            message: 'User exists'
        })
    } else if (existingUser) {
        state.users.destroy(existingUser.token)
    }

    const user = new User(data.username)

    state.users.add(user, user.token)

    logger.info('New login: ' + user.nickname)

    actions.res({
        success: true,
        username: data.username,
        token: user.token
    })
}
