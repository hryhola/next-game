import { useContext } from 'react'
import { Route, RouterContext } from 'client/context/list/routerCtx'
import { LoginRoute } from 'client/route/login-route/LoginRoute'
import { HomeRoute } from 'client/route/home-route/HomeRoute'
import { ErrorRoute } from 'client/route/error-route/ErrorRoute'
import { LobbyRoute } from 'client/route/lobby-route/LobbyRoute'
import { PackEditor } from 'client/route/pack-editor/PackEditor'
import { WsApp } from 'client/features/ws-app/WsApp'
import { useRouter } from 'client/context/list'

const pageMap: Record<Route, JSX.Element> = {
    Login: <LoginRoute />,
    Home: <HomeRoute />,
    Lobby: <LobbyRoute />,
    PackEditor: <PackEditor />
}

export const Router = () => {
    const { currentRoute } = useRouter()

    const page = pageMap[currentRoute]

    if (!page) {
        return <ErrorRoute />
    }

    switch (currentRoute) {
        case 'Home':
        case 'Lobby':
        case 'Login':
            return <WsApp>{page}</WsApp>
        default:
            return page
    }
}
