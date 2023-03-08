export type StateEvents = {} & // @index('../state/**/*.events.ts', f => `    & import('${f.path}').Events`)
import('../state/common/Chat.events').Events &
    import('../state/common/game/AbstractGame.events').Events &
    import('../state/lobby/Lobby.events').Events &
    import('../state/lobby/ReadyCheck.events').Events &
    import('../state/user/UserRegistry.events').Events
// @endindex

export type StateEventName = keyof StateEvents
