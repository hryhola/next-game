import { makeAutoObservable, reaction } from 'mobx'
import { Chat, UserRegistry, LobbiesRegistry } from 'state'
import { ReactionActions } from 'uWebSockets/utils/reactions'

export class State {
    static res: ReactionActions

    globalChat = new Chat(1000)
    lobbies = new LobbiesRegistry()
    users = new UserRegistry()

    constructor(res: ReactionActions) {
        State.res = res

        makeAutoObservable(this)

        reaction(
            () => this.globalChat.messages,
            curr => {
                res.publishGlobal('Chat-NewMessage', {
                    scope: 'global',
                    message: curr.at(-1)!
                })
            }
        )

        reaction(
            () => this.users.list.map(({ nickname, online }) => ({ nickname, online })),
            curr => {
                const onlineUsers = curr.filter(u => u.online)

                res.publishGlobal('Universal-UsersCountUpdate', {
                    success: true,
                    scope: 'global',
                    count: onlineUsers.length
                })

                res.publishGlobal('Universal-UsersUpdate', {
                    success: true,
                    scope: 'global',
                    data: onlineUsers,
                    count: onlineUsers.length
                })
            }
        )
    }
}
