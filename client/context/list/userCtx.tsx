import { UserData } from 'state'
import React, { useState, createContext } from 'react'

export type RouteType = 'Login'

export const UserContext = createContext({
    id: '',
    setId: (_val: string) => {},
    nickname: '',
    setNickname: (_val: string) => {},
    nicknameColor: '',
    setNicknameColor: (_val: string) => {},
    avatarUrl: '',
    setAvatarRes: (_val: string) => {}
})

interface Props {
    children?: JSX.Element
    user: UserData
}

export const UserProvider: React.FC<Props> = props => {
    const [user, setUser] = useState({
        id: props.user?.id || '',
        nicknameColor: props.user?.nicknameColor || 'deeppink',
        nickname: props.user?.nickname || '',
        avatarUrl: props.user?.avatarUrl || ''
    })

    const setId = (val: string) => setUser(u => ({ ...u, id: val }))
    const setNickname = (val: string) => setUser(u => ({ ...u, nickname: val }))
    const setNicknameColor = (val: string) => setUser(u => ({ ...u, nicknameColor: val }))
    const setAvatarRes = (val: string) => setUser(u => ({ ...u, avatarUrl: val }))

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
