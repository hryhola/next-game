import React, { useState, createContext } from 'react'

export type Route = 'Login'

export interface RouterData {
    profilePictureUrl: string
    setProfilePictureUrl: (value: string) => void
    username: string
    setUsername: (value: string) => void
}

const init: RouterData = {
    profilePictureUrl: '',
    username: '',
    setProfilePictureUrl: () => {
        throw new Error('Too soon')
    },
    setUsername: () => {
        throw new Error('Too soon')
    }
}

export const UserContext = createContext<RouterData>(init)

interface Props {
    children?: JSX.Element
}

export const UserProvider: React.FC<Props> = props => {
    const [username, setUsername] = useState('')
    const [profilePictureUrl, setProfilePictureUrl] = useState('https://gordonua.com/img/article/16025/78_big.jpg')

    return <UserContext.Provider value={{ username, setUsername, profilePictureUrl, setProfilePictureUrl }}>{props.children}</UserContext.Provider>
}
