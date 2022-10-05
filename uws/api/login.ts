import { WebSocket } from 'uWebSockets.js'
import { Handler } from '../uws.types'
import { state } from '../../state'
import { contexts } from '../contexts'

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

    res.publish(contexts.globalOnline, {
        ctx: contexts.globalOnline,
        data: {
            onlineUsersCount: state.users.length
        }
    })
}
