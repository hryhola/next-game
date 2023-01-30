import { reaction } from 'mobx'
import { State } from './AppState'

export const reactions = (appState: State) => {
    reaction(
        () => appState.globalChat.messages,
        curr => {
            State.res.publishGlobal('Chat-NewMessage', {
                scope: 'global',
                message: curr.at(-1)!
            })
        }
    )
}
