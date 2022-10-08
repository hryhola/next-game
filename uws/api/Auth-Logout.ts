import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { topics } from '../events'

export interface CloseRequest {
    username: string
}

export const handler: Handler<CloseRequest> = (res, data) => {
    state.globalChat.onlineUsers = state.globalChat.onlineUsers.filter(u => u.id !== data.username)

    res.publish(topics.globalOnlineUpdate, {
        ctx: topics.globalOnlineUpdate,
        data: {
            onlineUsersCount: state.globalChat.onlineUsers.length
        } as GlobalOnlineUpdate
    })
}
