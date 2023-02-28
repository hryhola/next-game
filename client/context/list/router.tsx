import React, { useState, createContext, useEffect } from 'react'

export type Route = 'Login' | 'Home' | 'Lobby' | 'PackEditor'

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
    defaultRoute: Route
}

export const RouterProvider: React.FC<Props> = props => {
    const [currentRoute, setCurrentRoute] = useState<Route>(props.defaultRoute)

    return <RouterContext.Provider value={{ currentRoute, setCurrentRoute }}>{props.children}</RouterContext.Provider>
}
