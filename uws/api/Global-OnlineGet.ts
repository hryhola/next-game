import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { topics } from '../events'
import { state } from '../../state'

export const handler: Handler = res => {
    res.send<GlobalOnlineUpdate>(topics.globalOnlineUpdate, {
        onlineUsersCount: state.onlineUsers.length
    })
}
