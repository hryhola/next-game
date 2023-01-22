import { Handler } from '../uws.types'
import logger from 'logger'
import { User } from 'state'

export interface Request {
    token: string
}

export interface Success {
    success: true
    user: User
}

export interface Failure {
    success: false
    message: string
}

export const handler: Handler<Request, Success | Failure> = (actions, state, data) => {
    if (!data.token) {
        return actions.res({
            success: false,
            message: 'Token is missing'
        })
    }

    const user = state.users.auth(data.token)

    if (!user) {
        return actions.res({
            success: false,
            message: 'Not valid token'
        })
    }

    user.setOnline(true)

    logger.info('New login: ' + user.nickname)

    actions.res({
        success: true,
        user
    })
}
