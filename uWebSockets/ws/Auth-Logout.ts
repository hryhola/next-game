import { Handler } from '../uws.types'
import { state } from '../../state'
import { authWithToken } from './utils/auth'
import logger from 'logger'
export interface Request {
    username: string
}

export const handler: Handler<Request> = (actions, data, token) => {
    const user = authWithToken(token, data.username)

    if (!user) {
        console.log(state)
        logger.error({ token, data }, 'Cannot find user for logout')

        return
    }

    user.setOnline(false)

    logger.info(user.nickname + 'is offline')

    const onlineUsers = state.users.filter(u => u.isOnline())

    // TODO tokenExpireTimeout

    actions.publishGlobal('GlobalOnline-UsersCountUpdate', {
        onlineUsersCount: onlineUsers.length
    })

    actions.publishGlobal('GlobalOnline-UsersUpdate', {
        users: onlineUsers
    })
}
