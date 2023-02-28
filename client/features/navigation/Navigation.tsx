import { List, ListItem, ListItemButton } from '@mui/material'
import React from 'react'
import ListItemText from '@mui/material/ListItemText'
import { useRouter } from 'client/context/list'

export const Navigation = () => {
    const router = useRouter() // todo

    return (
        <List>
            <ListItem disablePadding>
                <ListItemButton>
                    <ListItemText>Home</ListItemText>
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton>
                    <ListItemText>Pack editor</ListItemText>
                </ListItemButton>
            </ListItem>
        </List>
    )
}
