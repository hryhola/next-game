import { ContextComposer } from './ContextComposer'
import { AuthProvider } from './list/auth.context'
import { RouterProvider } from './list/router.context'
import { WSProvider } from './list/ws.context'
import { LobbyProvider } from './list/lobby.context'

export const AppContext: React.FC<{ children: JSX.Element }> = props => (
    <ContextComposer components={[RouterProvider, AuthProvider, WSProvider, LobbyProvider]}>{props.children}</ContextComposer>
)
