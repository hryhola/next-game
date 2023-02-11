import { UserData } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/t'
import { Handler } from 'uWebSockets/uws.types'

type Request = {
    scope: 'global'
}

export type GetUsersSuccess = GeneralSuccess & {
    scope: string
    lobbyId?: string
    count: number
    data: UserData[]
}

export const handler: Handler<Request, GetUsersSuccess | GeneralFailure> = (act, state, data) => {
    const users = state.users.onlineUsers

    const response: GetUsersSuccess = {
        success: true,
        scope: data.scope,
        count: users.length,
        data: users.map(u => u.state)
    }

    act.res(response)
}
