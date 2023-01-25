import { List, ListItem, ListItemText } from '@mui/material'
import React from 'react'

interface Props {
    users: Array<{ nickname: string }>
}

export const UsersListBox: React.FC<Props> = props => {
    if (!props.users.length) {
        return <></>
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
