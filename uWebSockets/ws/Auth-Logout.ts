import { Handler } from '../uws.types'
import logger from 'logger'
export interface Request {
    nickname: string
}

export const handler: Handler<Request> = (act, state, data, token) => {
    const user = state.users.logout({
        token: token!,
        nickname: data.nickname
    })

    if (!user) {
        logger.warn({ token, data }, 'Cannot find user for logout')

        return
    }

    logger.info(user.state.nickname + ' is offline')
}
