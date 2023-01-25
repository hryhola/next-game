import { Handler } from '../uws.types'
import { TChatMessage } from 'state'
import { GeneralFailure, GeneralSuccess } from 'util/t'

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

export const handler: Handler<Request, Success | GeneralFailure> = (actions, state, data) => {
    const chat = data.scope === 'global' ? state.globalChat : state.lobbies.get(data.lobbyId)?.chat

    if (!chat) {
        return actions.res({
            success: false,
            message: 'Cannot find chat for scope: ' + data.scope
        })
    }

    const response: Success = {
        success: true,
        scope: data.scope,
        messages: chat.messages.slice(-50).reverse()
    }

    if (data.scope === 'lobby') {
        response.lobbyId = data.lobbyId
    }

    actions.res(response)
}
