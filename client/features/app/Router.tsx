import { useContext } from 'react'
import { Route, RouterContext } from 'client/context/list/router.context'
import { LoginRoute } from 'client/route/login-route/LoginRoute'
import { HomeRoute } from 'client/route/home-route/HomeRoute'
import { ErrorRoute } from 'client/route/error-route/ErrorRoute'
import { LobbyRoute } from 'client/route/lobby-route/LobbyRoute'

const pageMap: Record<Route, JSX.Element> = {
    Login: <LoginRoute />,
    Home: <HomeRoute />,
    Lobby: <LobbyRoute />
}

export const Router = () => {
    const { currentRoute } = useContext(RouterContext)

    const page = pageMap[currentRoute]

    if (!page) {
        return <ErrorRoute />
    }

    return page
}
