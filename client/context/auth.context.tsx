import React, { useState, createContext } from 'react'

export type Route = 'Login'

export interface RouterData {
    username: string
    setUsername: (value: string) => void
}

const init: RouterData = {
    username: '',
    setUsername: () => {
        throw new Error('Too soon')
    }
}

export const AuthContext = createContext<RouterData>(init)

interface Props {
    children?: JSX.Element
}

export const AuthProvider: React.FC<Props> = props => {
    const [username, setUsername] = useState('')

    return <AuthContext.Provider value={{ username, setUsername }}>{props.children}</AuthContext.Provider>
}
