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
}

export interface Failure {
    success: false
    username: string
    message: string
}

export const handler: Handler<Request, Success | Failure> = (actions, data) => {
    if (state.users.some(u => u.id === data.username)) {
        actions.res({
            success: false,
            username: data.username,
            message: 'User exists'
        })

        return
    }

    const user = new User(data.username)

    state.users.push(user)

    logger.info('New login: ' + user.id)

    actions.res({
        success: true,
        username: data.username
    })

    actions.publishGlobal('GlobalOnline-UsersCountUpdate', {
        onlineUsersCount: state.users.length
    })

    actions.publishGlobal('GlobalOnline-UsersUpdate', {
        users: state.users
    })
}
