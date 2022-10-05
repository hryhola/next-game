import React, { useState, createContext } from 'react'

export type Route = 'Login' | 'Home'

export interface RouterData {
    currentRoute: Route
    setCurrentRoute: (value: Route) => void
}

const init: RouterData = {
    currentRoute: 'Login',
    setCurrentRoute: () => {
        throw new Error('Too soon')
    }
}

export const RouterContext = createContext<RouterData>(init)

interface Props {
    children?: JSX.Element
}

export const RouterProvider: React.FC<Props> = props => {
    const [currentRoute, setCurrentRoute] = useState<Route>('Login')

    return <RouterContext.Provider value={{ currentRoute, setCurrentRoute }}>{props.children}</RouterContext.Provider>
}
