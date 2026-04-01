import { UsersListBox } from 'client/ui'
import React from 'react'
import { GlobalOnlineUser } from './useGlobalOnlineUsers'

type Props = {
    users: GlobalOnlineUser[]
}

export const GlobalUsersList: React.FC<Props> = props => {
    return <UsersListBox users={props.users} />
}
