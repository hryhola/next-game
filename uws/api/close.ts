import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { channel } from '../channel'

export interface CloseRequest {
    username: string
}

export const close: Handler<CloseRequest> = (res, data) => {
    state.users = state.users.filter(u => u.id !== data.username)

    res.publish(channel.globalOnline, {
        ctx: channel.globalOnline,
        data: {
            onlineUsersCount: state.users.length
        } as GlobalOnlineUpdate
    })
}
