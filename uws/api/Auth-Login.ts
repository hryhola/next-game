import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { topics } from '../events'
import { User } from 'model'

export interface LoginRequest {
    username: string
}

export interface Success {
    success: true
    username: string
}

export interface Failure {
    success: false
    username: string
    message: string
}

export const handler: Handler<LoginRequest> = (actions, data) => {
    if (state.users.some(u => u.id === data.username)) {
        actions.res<'Auth-Login'>({
            success: false,
            username: data.username,
            message: 'User exists'
        })

        return
    }

    const user = new User(data.username)

    state.users.push(user)

    console.log(state.users.length)

    actions.res<'Auth-Login'>({
        success: true,
        username: data.username
    })

    actions.publish(topics.globalOnlineUpdate, {
        ctx: topics.globalOnlineUpdate,
        data: {
            onlineUsersCount: state.users.length
        } as GlobalOnlineUpdate
    })
}
