import { reaction } from 'mobx'
import { State } from 'state'
import { Lobby } from './Lobby'

export const reactions = (lobby: Lobby) => {
    reaction(
        () => lobby.chat.messages.length,
        () => {
            State.res.publish(`lobby-${lobby.id}-all`, {
                ctx: 'Chat-NewMessage',
                data: {
                    scope: 'lobby',
                    lobbyId: lobby.id,
                    message: lobby.chat.messages.at(-1)!
                }
            })
        }
    )
}
