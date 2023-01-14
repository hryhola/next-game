import React, { useState, createContext } from 'react'

export const HomeContext = createContext({
    isProfileEditOpen: false,
    setIsProfileEditOpen: (_value: boolean) => {},
    isNavigationOpen: false,
    setIsNavigationOpen: (_value: boolean) => {},
    isCreateLobbyOpen: false,
    setIsCreateLobbyOpen: (_value: boolean) => {}
})

interface Props {
    children?: JSX.Element
}

export const HomeProvider: React.FC<Props> = props => {
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
    const [isNavigationOpen, setIsNavigationOpen] = useState(false)
    const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(false)

    const context = {
        isProfileEditOpen,
        setIsProfileEditOpen,
        isNavigationOpen,
        setIsNavigationOpen,
        isCreateLobbyOpen,
        setIsCreateLobbyOpen
    }

    return <HomeContext.Provider value={context}>{props.children}</HomeContext.Provider>
}
