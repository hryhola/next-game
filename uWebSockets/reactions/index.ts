import { reaction } from 'mobx'
import { State } from 'state'
import { ReactionActions } from 'uWebSockets/utils/reactions'

export const ReactionsRegister = (actions: ReactionActions, state: State) => {
    reaction(
        () => state.globalChat.messages,
        curr => {
            actions.publishGlobal('GlobalChat-NewMessage', {
                message: curr.at(-1)!
            })
        }
    )

    reaction(
        () => state.users.list.map(({ nickname, online }) => ({ nickname, online })),
        curr => {
            const onlineUsers = curr.filter(u => u.online)

            actions.publishGlobal('GlobalOnline-UsersCountUpdate', {
                onlineUsersCount: onlineUsers.length
            })

            actions.publishGlobal('GlobalOnline-UsersUpdate', {
                users: onlineUsers
            })
        }
    )

    reaction(
        () => state.users.add,
        () => {},
        {}
    )
}
