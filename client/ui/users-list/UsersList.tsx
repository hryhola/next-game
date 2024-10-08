import { FormControl, InputAdornment, List, ListItem, ListItemText, OutlinedInput, Toolbar } from '@mui/material'
import React, { useState } from 'react'
import SearchIcon from '@mui/icons-material/Search'

interface Props {
    users: Array<{ userNickname: string; id: string }>
}

export const UsersListBox: React.FC<Props> = props => {
    const [searchString, setSearchString] = useState('')

    const renderedUsers = searchString.length ? props.users.filter(u => u.userNickname.toLowerCase().includes(searchString.toLowerCase())) : props.users

    return (
        <>
            <Toolbar sx={{ pt: 2 }}>
                <FormControl fullWidth variant="filled">
                    <OutlinedInput
                        size="small"
                        fullWidth
                        placeholder="Search..."
                        value={searchString}
                        onChange={e => setSearchString(e.target.value)}
                        endAdornment={
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        }
                    />
                </FormControl>
            </Toolbar>
            <List>
                {renderedUsers.map(user => (
                    <ListItem key={user.id}>
                        <ListItemText>{user.userNickname}</ListItemText>
                    </ListItem>
                ))}
            </List>
        </>
    )
}
