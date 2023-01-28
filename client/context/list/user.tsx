import { TUser, User } from 'state'
import React, { useState, createContext } from 'react'

export type Route = 'Login'

export const UserContext = createContext({
    nickname: '',
    setNickname: (_val: string) => {},
    nicknameColor: '',
    setNicknameColor: (_val: string) => {},
    avatarRes: '',
    setAvatarRes: (_val: string) => {}
})

interface Props {
    children?: JSX.Element
    user: TUser
}

export const UserProvider: React.FC<Props> = props => {
    const [user, setUser] = useState({
        nicknameColor: props.user?.nicknameColor || 'deeppink',
        nickname: props.user?.nickname || '',
        avatarRes: props.user?.avatarRes ? '/res/' + props.user?.avatarRes : ''
    })

    const setNickname = (val: string) => setUser(u => ({ ...u, nickname: val }))
    const setNicknameColor = (val: string) => setUser(u => ({ ...u, nicknameColor: val }))
    const setAvatarRes = (val: string) => setUser(u => ({ ...u, avatarRes: val }))

    return (
        <UserContext.Provider
            value={{
                ...user,
                setNickname,
                setAvatarRes,
                setNicknameColor
            }}
        >
            {props.children}
        </UserContext.Provider>
    )
}
