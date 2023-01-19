import { Handler } from '../uws.types'
import { state } from '../../state'
import { User } from 'model'
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

export const handler: Handler<Request, Success | Failure> = (actions, data) => {
    const existingUser = state.users.find(u => u.nickname === data.username)

    if (existingUser?.isOnline()) {
        actions.res({
            success: false,
            username: data.username,
            message: 'User exists'
        })

        return
    } else if (existingUser) {
        existingUser.destroyToken()
    }

    const user = new User(data.username)

    state.users.push(user)

    logger.info('New login: ' + user.nickname)

    actions.res({
        success: true,
        username: data.username,
        token: user.getToken()
    })

    actions.publishGlobal('GlobalOnline-UsersCountUpdate', {
        onlineUsersCount: state.users.length
    })

    actions.publishGlobal('GlobalOnline-UsersUpdate', {
        users: state.users
    })
}
