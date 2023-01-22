import { Handler } from '../uws.types'

interface Success {
    onlineUsersCount: number
}

export const handler: Handler<null, Success> = (actions, state) => {
    actions.res({
        onlineUsersCount: state.users.onlineUsers.length
    })
}
