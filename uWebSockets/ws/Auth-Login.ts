import { Handler } from '../uws.types'
import { state } from '../../state'
import { TUser } from 'model'
import logger from 'logger'

export interface Request {
    token: string
}

export interface Success {
    success: true
    user: TUser
}

export interface Failure {
    success: false
    message: string
}

export const handler: Handler<Request, Success | Failure> = (actions, data) => {
    if (!data.token) {
        return actions.res({
            success: false,
            message: 'Token is missing'
        })
    }

    const user = state.auth[data.token]

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

    actions.publishGlobal('GlobalOnline-UsersCountUpdate', {
        onlineUsersCount: state.users.length
    })

    actions.publishGlobal('GlobalOnline-UsersUpdate', {
        users: state.users
    })
}
