import { Handler } from '../uws.types'
import { UserData, User } from 'state'
import logger from 'logger'

export interface Request {
    userNickname: string
}

export interface Success {
    success: true
    user: UserData
    token: string
}

export interface Failure {
    success: false
    nickname: string
    message: string
}

export const handler: Handler<Request, Success | Failure> = (act, state, data) => {
    const existingUser = state.users.getByNickname(data.userNickname)

    if (existingUser?.state.userIsOnline) {
        return act.res({
            success: false,
            nickname: data.userNickname,
            message: 'User exists'
        })
    } else if (existingUser) {
        state.users.destroy(existingUser.token)
    }

    const user = state.users.register(data.userNickname, act.ws)

    logger.info('New login: ' + user.state.userNickname)

    act.res({
        success: true,
        user: user.data(),
        token: user.token
    })
}
