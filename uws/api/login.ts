import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'
import { channel } from '../channel'

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

export const login: Handler<LoginRequest> = (res, data) => {
    if (state.users.some(u => u.id === data.username)) {
        res.send<LoginFailure>({
            success: false,
            username: data.username,
            message: 'User exists'
        })

        return
    }

    state.users.push({ id: data.username })

    res.send<LoginSuccess>({
        success: true,
        username: data.username
    })

    res.publish(channel.globalOnline, {
        ctx: channel.globalOnline,
        data: {
            onlineUsersCount: state.users.length
        } as GlobalOnlineUpdate
    })
}
