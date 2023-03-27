import { Handler } from '../uws.types'
import { TChatMessage } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/universalTypes'

type Request =
    | {
          scope: 'global'
      }
    | {
          scope: 'lobby'
          lobbyId: string
      }

type Success = GeneralSuccess & {
    messages: TChatMessage[]
    scope: 'global' | 'lobby'
    lobbyId?: string
}

export const handler: Handler<Request, Success | GeneralFailure> = (act, state, data) => {
    const chat = data.scope === 'global' ? state.globalChat : state.lobbies.get(data.lobbyId)?.chat

    if (!chat) {
        return act.res({
            success: false,
            message: 'Cannot find chat for scope: ' + data.scope
        })
    }

    const response: Success = {
        success: true,
        scope: data.scope,
        messages: chat.getMessages(50).reverse()
    }

    if (data.scope === 'lobby') {
        response.lobbyId = data.lobbyId
    }

    act.res(response)
}
