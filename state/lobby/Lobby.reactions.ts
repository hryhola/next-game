import { reaction } from 'mobx'
import { Lobby } from './Lobby'

export const reactions = (lobby: Lobby) => {
    reaction(
        () => lobby.chat.messages.length,
        () => {
            lobby.publish({
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
