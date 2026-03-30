import React, { useState, createContext } from 'react'

// ? Could be moved to HomeRoute itself
export const HomeContext = createContext({
    isProfileEditOpen: false,
    setIsProfileEditOpen: (_value: boolean) => {},
    isCreateLobbyOpen: false,
    setIsCreateLobbyOpen: (_value: boolean) => {}
})

interface Props {
    children?: React.ReactNode
}

export const HomeProvider: React.FC<Props> = props => {
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
    const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(false)

    const context = {
        isProfileEditOpen,
        setIsProfileEditOpen,
        isCreateLobbyOpen,
        setIsCreateLobbyOpen
    }

    return <HomeContext.Provider value={context}>{props.children}</HomeContext.Provider>
}

export const useHome = () => {
    return React.useContext(HomeContext)
}
