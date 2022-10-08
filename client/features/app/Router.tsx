import { useContext } from 'react'
import { Route, RouterContext } from '../../context/router.context'
import { LoginRoute } from '../../route/login-route/LoginRoute'
import { HomeRoute } from '../../route/home-route/HomeRoute'
import { ErrorRoute } from '../../route/error-route/ErrorRoute'

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
