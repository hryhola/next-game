import { ContextComposer } from './ContextComposer'
import { UserProvider } from './list/user'
import { RouterProvider } from './list/router'
import { WSProvider } from './list/ws'
import { LobbyProvider } from './list/jeopardy'
import { HomeProvider } from './list/home'

export const AppContext: React.FC<{ children: JSX.Element }> = props => (
    <ContextComposer components={[RouterProvider, UserProvider, WSProvider, LobbyProvider, HomeProvider]}>{props.children}</ContextComposer>
)
