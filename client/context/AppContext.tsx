import { ContextComposer } from './ContextComposer'
import { UserProvider } from './list/userCtx'
import { Route, RouterProvider } from './list/routerCtx'
import { WSProvider } from './list/wsCtx'
import { LobbyProvider } from './list/lobbyCtx'
import { HomeProvider } from './list/homeCtx'
import { AudioProvider } from './list/audioCtx'

type Props = {
    children: JSX.Element[]
    defaultRoute: Route
}

export const AppContext: React.FC<Props> = props => (
    <ContextComposer components={[RouterProvider, UserProvider, WSProvider, LobbyProvider, HomeProvider, AudioProvider]} props={props}>
        {props.children}
    </ContextComposer>
)
