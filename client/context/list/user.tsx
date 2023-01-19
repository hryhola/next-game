import React, { useState, createContext } from 'react'

export type Route = 'Login'

export const UserContext = createContext({
    username: '',
    setUsername: (_val: string) => {},
    profilePictureUrl: '',
    setProfilePictureUrl: (_val: string) => {}
})

interface Props {
    children?: JSX.Element
}

export const UserProvider: React.FC<Props> = props => {
    const [username, setUsername] = useState('')
    const [profilePictureUrl, setProfilePictureUrl] = useState('')

    return <UserContext.Provider value={{ username, setUsername, profilePictureUrl, setProfilePictureUrl }}>{props.children}</UserContext.Provider>
}
