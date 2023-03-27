import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import { Handler } from 'uWebSockets/uws.types'

type Request = {
    scope: 'global'
}

export type GetUsersCountSuccess = GeneralSuccess & {
    scope: string
    lobbyId?: string
    count: number
}

export const handler: Handler<Request, GetUsersCountSuccess | GeneralFailure> = (act, state, data) => {
    const users = state.users.onlineUsers

    const response: GetUsersCountSuccess = {
        success: true,
        scope: data.scope,
        count: users.length
    }

    act.res(response)
}
