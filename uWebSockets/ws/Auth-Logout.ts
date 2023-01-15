import { Handler } from '../uws.types'
import { state } from '../../state'

export interface Request {
    username: string
}

export const handler: Handler<Request> = (actions, data) => {
    state.users = state.users.filter(u => u.id !== data.username)

    actions.publishGlobal('GlobalOnline-UsersCountUpdate', {
        onlineUsersCount: state.users.length
    })

    actions.publishGlobal('GlobalOnline-UsersUpdate', {
        users: state.users
    })
}
