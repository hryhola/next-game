import { User } from 'state'
import { Handler } from 'uWebSockets/uws.types'

export interface Success {
    users: Pick<User, 'nickname'>[]
}

export const handler: Handler<null, Success> = (res, state) => {
    res.res({
        users: state.users.onlineUsers.map(u => ({
            nickname: u.nickname
        }))
    })
}
