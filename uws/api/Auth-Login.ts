import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { topics } from '../events'

export interface LoginRequest {
    username: string
}

export interface LoginSuccess {
    success: true
    username: string
}

export interface LoginFailure {
    success: false
    username: string
    message: string
}

export const handler: Handler<LoginRequest> = (actions, data) => {
    if (state.onlineUsers.some(u => u.id === data.username)) {
        actions.res<LoginFailure>({
            success: false,
            username: data.username,
            message: 'User exists'
        })

        return
    }

    state.onlineUsers.push({ id: data.username })

    actions.res<LoginSuccess>({
        success: true,
        username: data.username
    })

    actions.publish(topics.globalOnlineUpdate, {
        ctx: topics.globalOnlineUpdate,
        data: {
            onlineUsersCount: state.onlineUsers.length
        } as GlobalOnlineUpdate
    })
}
