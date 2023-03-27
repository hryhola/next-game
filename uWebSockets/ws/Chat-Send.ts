import { Handler } from 'uWebSockets/uws.types'
import { TChatMessage } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'

type Request = {
    message: TChatMessage
} & (
    | {
          scope: 'global'
      }
    | {
          scope: 'lobby'
          lobbyId: string
      }
)

export const handler: Handler<Request, GeneralSuccess | GeneralFailure> = (act, state, data) => {
    const chat = data.scope === 'global' ? state.globalChat : state.lobbies.get(data.lobbyId).chat

    if (!chat) {
        return act.res({
            success: false,
            message: 'Cannot find chat for scope: ' + data.scope
        })
    }

    chat.addMessage(data.message)

    act.res({
        success: true
    })
}
