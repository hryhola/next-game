import { WSContext } from 'client/context/list/ws.context'
import { UsersList } from 'client/ui'
import { TUser } from 'model'
import React, { useContext, useEffect, useState } from 'react'

type Props = {}

export const GlobalUsersList: React.FC<Props> = props => {
    // const user = useContext(UserContext)
    const ws = useContext(WSContext)
    const [users, setUsers] = useState<TUser[]>([])

    const handleUsersGot = (data: { users: TUser[] }) => {
        setUsers(data.users)
    }

    useEffect(() => {
        ws.on('Global-UsersGet', handleUsersGot)

        ws.send('Global-UsersGet')
    }, [])

    return <UsersList users={users} />
}
