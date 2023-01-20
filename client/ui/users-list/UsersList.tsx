import { List, ListItem, ListItemText } from '@mui/material'
import React from 'react'

interface Props {
    users: Array<{ nickname: string }>
}

export const UsersList: React.FC<Props> = props => {
    if (!props.users.length) {
        return <>There are no users.</>
    }

    return (
        <List>
            {props.users.map(user => (
                <ListItem key={user.nickname}>
                    <ListItemText>{user.nickname}</ListItemText>
                </ListItem>
            ))}
        </List>
    )
}
