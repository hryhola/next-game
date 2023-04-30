import { UserData } from 'state'
import React, { useState, createContext } from 'react'

export type RouteType = 'Login'

export const UserContext = createContext({
    id: '',
    setId: (_val: string) => {},
    userNickname: '',
    setNickname: (_val: string) => {},
    userColor: '',
    setNicknameColor: (_val: string) => {},
    userAvatarUrl: '',
    setAvatarRes: (_val: string) => {}
})

interface Props {
    children?: JSX.Element
    user: UserData
}

export const UserProvider: React.FC<Props> = props => {
    const [user, setUser] = useState({
        id: props.user?.id || '',
        userColor: props.user?.userColor || 'deeppink',
        userNickname: props.user?.userNickname || '',
        userAvatarUrl: props.user?.userAvatarUrl || ''
    })

    const setId = (val: string) => setUser(u => ({ ...u, id: val }))
    const setNickname = (val: string) => setUser(u => ({ ...u, userNickname: val }))
    const setNicknameColor = (val: string) => setUser(u => ({ ...u, userColor: val }))
    const setAvatarRes = (val: string) => setUser(u => ({ ...u, userAvatarUrl: val }))

    return (
        <UserContext.Provider
            value={{
                ...user,
                setId,
                setNickname,
                setAvatarRes,
                setNicknameColor
            }}
        >
            {props.children}
        </UserContext.Provider>
    )
}

export const useUser = () => {
    return React.useContext(UserContext)
}
