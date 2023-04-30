import logger from 'logger'
import { State, User } from 'state'
import { WebSocket } from 'uWebSockets.js'

export class UserRegistry {
    private list: User[] = []

    get onlineUsers() {
        return this.list.filter(u => u.state.userIsOnline)
    }

    private publishOnlineUpdate() {
        State.act.publishTopicEvent('UserRegistry-OnlineUpdate', {
            scope: 'global',
            list: this.onlineUsers.map(u => ({
                userNickname: u.state.userNickname,
                id: u.id
            }))
        })
    }

    register(nickname: string, ws: WebSocket<unknown>) {
        const user = new User(nickname, ws)

        user.onUpdate(data => {
            if ('isOnline' in data || 'nickname' in data) {
                this.publishOnlineUpdate()
            }
        })

        this.list.push(user)

        this.publishOnlineUpdate()

        return user
    }

    login(token: string) {
        const user = this.getByToken(token)

        if (!user) {
            return null
        }

        user.update({ userIsOnline: true })

        return user
    }

    logout(data: { token: string; userNickname: string }) {
        const user = data.token ? this.getByToken(data.token) : this.getByNickname(data.userNickname)

        if (!user) {
            return null
        }

        user.update({ userIsOnline: false })

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
        return this.list.find(u => u.state.userNickname === nickname)
    }

    getByConnection(ws: WebSocket<unknown>) {
        return this.list.find(u => u.ws === ws)
    }

    data() {
        return this.list.map(u => u.data())
    }
}
