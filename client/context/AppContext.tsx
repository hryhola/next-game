import { ContextComposer } from './ContextComposer'
import { UserProvider } from './list/user'
import { Route, RouterProvider } from './list/router'
import { WSProvider } from './list/ws'
import { LobbyProvider } from './list/lobby'
import { HomeProvider } from './list/home'

type Props = {
    children: JSX.Element[]
    defaultRoute: Route
}

export const AppContext: React.FC<Props> = props => (
    <ContextComposer components={[RouterProvider, UserProvider, WSProvider, LobbyProvider, HomeProvider]} props={props}>
        {props.children}
    </ContextComposer>
)
