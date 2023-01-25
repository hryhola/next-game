import { reaction } from 'mobx'
import { State } from 'state'
import { ReactionActions } from 'uWebSockets/utils/reactions'

export const ReactionsRegister = (actions: ReactionActions, state: State) => {
    // reaction(
    //     () => state.globalChat.messages,
    //     curr => {
    //         actions.publishGlobal('Chat-NewMessage', {
    //             scope: 'global',
    //             message: curr.at(-1)!
    //         })
    //     }
    // )
}
