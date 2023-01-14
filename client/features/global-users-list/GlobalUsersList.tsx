import { WSContext } from 'client/context/list/ws'
import { UsersList } from 'client/ui'
import { TUser } from 'model'
import React, { useContext, useEffect, useState } from 'react'
import { RequestHandler } from 'uWebSockets/uws.types'

type Props = {}

export const GlobalUsersList: React.FC<Props> = props => {
    const ws = useContext(WSContext)
    const [users, setUsers] = useState<TUser[]>([])

    const handleUsersGot: RequestHandler<'Global-UsersGet'> = data => {
        setUsers(data.users)
    }

    useEffect(() => {
        ws.on('Global-UsersGet', handleUsersGot)

        ws.send('Global-UsersGet')
    }, [])

    return <UsersList users={users} />
}
