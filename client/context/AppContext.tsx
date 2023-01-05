import { ContextComposer } from './ContextComposer'
import { UserProvider } from './list/user.context'
import { RouterProvider } from './list/router.context'
import { WSProvider } from './list/ws.context'
import { LobbyProvider } from './list/lobby.context'
import { HomeProvider } from './list/home.context'

export const AppContext: React.FC<{ children: JSX.Element }> = props => (
    <ContextComposer components={[RouterProvider, UserProvider, WSProvider, LobbyProvider, HomeProvider]}>{props.children}</ContextComposer>
)
