import { Handler } from '../uws.types'
import logger from 'logger'
export interface Request {
    username: string
}

export const handler: Handler<Request> = (actions, state, data, token) => {
    const user = state.users.auth(token!)

    if (!user) {
        logger.warn({ token, data }, 'Cannot find user for logout')

        return
    }

    user.setOnline(false)

    logger.info(user.nickname + 'is offline')

    // TODO tokenExpireTimeout
}
