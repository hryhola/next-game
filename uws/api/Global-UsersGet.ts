import { Handler } from 'uws/uws.types'
import { state } from '../../state'

export interface Success {
    users: { id: string }[]
}

export const handler: Handler = res => {
    res.res<'Global-UsersGet'>({
        users: state.users.map(u => ({
            id: u.id
        }))
    })
}
