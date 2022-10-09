import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { topics } from '../events'

export interface CloseRequest {
    username: string
}

export const handler: Handler<CloseRequest> = (res, data) => {
    state.users = state.users.filter(u => u.id !== data.username)

    res.publish(topics.globalOnlineUpdate, {
        ctx: topics.globalOnlineUpdate,
        data: {
            onlineUsersCount: state.users.length
        } as GlobalOnlineUpdate
    })
}
