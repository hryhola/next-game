import { Handler } from '../uws.types'
import logger from 'logger'
export interface Request {
    userNickname: string
}

export const handler: Handler<Request> = (act, state, data, token) => {
    const user = state.users.logout({
        token: token!,
        userNickname: data.userNickname
    })

    if (!user) {
        logger.warn({ token, data }, 'Cannot find user for logout')

        return
    }

    logger.info(user.state.userNickname + ' is offline')
}
