import React, { useState, createContext } from 'react'

export const HomeContext = createContext({
    isProfileEditModalOpen: false,
    setIsProfileEditModalOpen: (_value: boolean) => {},
    isNavigationOpen: false,
    setIsNavigationOpen: (_value: boolean) => {}
})

interface Props {
    children?: JSX.Element
}

export const HomeProvider: React.FC<Props> = props => {
    const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false)
    const [isNavigationOpen, setIsNavigationOpen] = useState(false)

    const context = {
        isProfileEditModalOpen,
        setIsProfileEditModalOpen,
        isNavigationOpen,
        setIsNavigationOpen
    }

    return <HomeContext.Provider value={context}>{props.children}</HomeContext.Provider>
}
