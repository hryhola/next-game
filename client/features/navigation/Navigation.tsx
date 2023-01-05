import { Box, Button, FormLabel, List, ListItem, ListItemButton } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user.context'
import React, { useContext } from 'react'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import ListItemText from '@mui/material/ListItemText'
import { RouterContext } from 'client/context/list/router.context'

export const Navigation = () => {
    const router = useContext(RouterContext)

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
