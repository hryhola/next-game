import logger from 'logger'
import { State, User } from 'state'
import { WebSocket } from 'uWebSockets.js'

export class UserRegistry {
    private list: User[] = []

    get onlineUsers() {
        return this.list.filter(u => u.state.isOnline)
    }

    private publishOnlineUpdate() {
        State.res.publishGlobal('UserRegistry-OnlineUpdate', {
            scope: 'global',
            list: this.onlineUsers.map(u => ({
                nickname: u.state.nickname
            }))
        })
    }

    register(nickname: string, ws: WebSocket<unknown>) {
        const user = new User(nickname, ws)

        user.onUpdate(data => {
            if ('online' in data || 'nickname' in data) {
                this.publishOnlineUpdate()
            }
        })

        this.list.push(user)

        return user
    }

    login(token: string) {
        const user = this.getByToken(token)

        if (!user) {
            return null
        }

        user.update({ isOnline: true })

        return user
    }

    logout(data: { token: string; nickname: string }) {
        const user = data.token ? this.getByToken(data.token) : this.getByNickname(data.nickname)

        if (!user) {
            return null
        }

        user.update({ isOnline: false })

        // TODO tokenExpireTimeout

        return user
    }

    destroy(token: string) {
        const user = this.getByToken(token)

        if (!user) {
            logger.warn(`UserRegistry: destroy: user not found by token ${token}`)
            return
        }

        user.leaveAllLobbies()

        this.list = this.list.filter(u => u !== user)

        this.publishOnlineUpdate()
    }

    getByToken(token: string) {
        return this.list.find(u => u.token === token)
    }

    getByNickname(nickname: string) {
        return this.list.find(u => u.state.nickname === nickname)
    }

    getByConnection(ws: WebSocket<unknown>) {
        return this.list.find(u => u.ws === ws)
    }
}
