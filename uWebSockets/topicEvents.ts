export type StateEvents = {} & import('../state/common/Chat.events').Events & // @index('../state/**/*.events.ts', f => `    & import('${f.path}').Events`)
    import('../state/common/game/Game.events').Events &
    import('../state/lobby/Lobby.events').Events &
    import('../state/lobby/ReadyCheck.events').Events &
    import('../state/user/UserRegistry.events').Events
// @endindex

export type StateEventName = keyof StateEvents
