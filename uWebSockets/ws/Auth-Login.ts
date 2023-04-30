import { Handler } from '../uws.types'
import logger from 'logger'
import { UserData } from 'state'

export interface Request {
    token: string
}

export interface Success {
    success: true
    user: UserData
}

export interface Failure {
    success: false
    message: string
}

export const handler: Handler<Request, Success | Failure> = (act, state, data) => {
    if (!data.token) {
        return act.res({
            success: false,
            message: 'Token is missing'
        })
    }

    const user = state.users.login(data.token)

    if (!user) {
        return act.res({
            success: false,
            message: 'Not valid token'
        })
    }

    logger.info('New login: ' + user.state.userNickname)

    act.res({
        success: true,
        user: user.data()
    })
}
