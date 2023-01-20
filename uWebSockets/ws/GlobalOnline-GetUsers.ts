import { TUser } from 'model'
import { Handler } from 'uWebSockets/uws.types'
import { state } from '../../state'

export interface Success {
    users: TUser[]
}

export const handler: Handler<null, Success> = res => {
    res.res({
        users: state.users.map(u => ({
            nickname: u.nickname
        }))
    })
}
