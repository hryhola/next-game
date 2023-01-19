import logger from 'logger'
import { User } from 'model'
import { state } from 'state'
import { Handler } from 'uWebSockets/uws.types'

export const authWithToken = (token?: string, username?: string): User | null => {
    let user: User | null = null

    user = state.auth[token!]

    if (!user) {
        user = state.users.find(u => u.nickname === username) || null
    }

    return user
}
