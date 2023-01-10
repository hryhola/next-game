import { List, ListItem, ListItemText } from '@mui/material'
import React from 'react'

interface Props {
    users: Array<{ id: string }>
}

export const UsersList: React.FC<Props> = props => {
    if (!props.users.length) {
        return <>There are no users.</>
    }

    return (
        <List>
            {props.users.map(user => (
                <ListItem key={user.id}>
                    <ListItemText>{user.id}</ListItemText>
                </ListItem>
            ))}
        </List>
    )
}
