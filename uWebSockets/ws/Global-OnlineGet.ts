import { Handler } from '../uws.types'
import { state } from '../../state'

interface Success {
    onlineUsersCount: number
}

export const handler: Handler<null, Success> = actions => {
    actions.res({
        onlineUsersCount: state.users.length
    })
}
