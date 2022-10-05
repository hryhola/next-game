import { useContext } from 'react'
import { Route, RouterContext } from '../../context/router.context'
import { LoginRoute } from '../../route/loginRoute/LoginRoute'
import { HomeRoute } from '../../route/homeRoute/HomeRoute'
import { ErrorRoute } from '../../route/errorRoute/ErrorRoute'

const pageMap: Record<Route, JSX.Element> = {
    Login: <LoginRoute />,
    Home: <HomeRoute />
}

export const Router = () => {
    const { currentRoute } = useContext(RouterContext)

    console.log(currentRoute)

    const page = pageMap[currentRoute]

    if (!page) {
        return <ErrorRoute />
    }

    return page
}
