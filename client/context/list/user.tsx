import { User } from 'state'
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
    user?: User // SSR user
    userAvatarUrl: string // SSR avatar link
}

export const UserProvider: React.FC<Props> = props => {
    const [username, setUsername] = useState(props.user?.nickname || '')
    const [profilePictureUrl, setProfilePictureUrl] = useState(props.user?.avatarRes ? '/res/' + props.user?.avatarRes : '')

    return <UserContext.Provider value={{ username, setUsername, profilePictureUrl, setProfilePictureUrl }}>{props.children}</UserContext.Provider>
}
