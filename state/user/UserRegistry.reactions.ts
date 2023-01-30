import { reaction } from 'mobx'
import { State } from '../AppState'
import { UserRegistry } from './UserRegistry'

export const reactions = (users: UserRegistry) => {
    reaction(
        () => users.list.map(({ nickname, online, nicknameColor }) => ({ nickname, online, nicknameColor })),
        curr => {
            const onlineUsers = curr.filter(u => u.online)

            State.res.publishGlobal('Universal-UsersCountUpdate', {
                success: true,
                scope: 'global',
                count: onlineUsers.length
            })

            State.res.publishGlobal('Universal-UsersUpdate', {
                success: true,
                scope: 'global',
                data: onlineUsers,
                count: onlineUsers.length
            })
        }
    )
}
