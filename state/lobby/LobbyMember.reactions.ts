import { reaction } from 'mobx'
import { LobbyMember } from './LobbyMember'

export const reactions = (lobbyMember: LobbyMember) => {
    reaction(
        () => lobbyMember.user.online,
        () => {
            lobbyMember.lobby.publish({
                ctx: 'LobbyMember-Online',
                data: {
                    lobbyId: lobbyMember.lobby.id,
                    userNickname: lobbyMember.user.nickname,
                    online: lobbyMember.user.online
                }
            })

            const player = lobbyMember.lobby.game.players.find(p => p.user.nickname === lobbyMember.user.nickname)

            if (player) {
                lobbyMember.lobby.game.onPlayerOffline(player)
            }
        }
    )
}
