import { useContext } from 'react'
import { Route, RouterContext } from 'client/context/list/router.context'
import { LoginRoute } from 'client/route/login-route/LoginRoute'
import { HomeRoute } from 'client/route/home-route/HomeRoute'
import { ErrorRoute } from 'client/route/error-route/ErrorRoute'

const pageMap: Record<Route, JSX.Element> = {
    Login: <LoginRoute />,
    Home: <HomeRoute />
}

export const Router = () => {
    const { currentRoute } = useContext(RouterContext)

    const page = pageMap[currentRoute]

    if (!page) {
        return <ErrorRoute />
    }

    return page
}
