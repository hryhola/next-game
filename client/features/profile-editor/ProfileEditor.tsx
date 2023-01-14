import { Box, Button, FormLabel } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user'
import React, { useState, useContext } from 'react'
import FileUploadIcon from '@mui/icons-material/FileUpload'

export const ProfileEditor = () => {
    const user = useContext(UserContext)
    const [nickname, setNickname] = useState(user.username)

    return (
        <Box component="form" display="flex" flexDirection="column">
            <TextField label="nickname" value={nickname} onChange={e => setNickname(e.target.value)} fullWidth />
            {/* <Box sx={{
                    backgroundImage: `url('${user.profilePictureUrl}')`,
                }}
            >
                 <PersonIcon sx={{ fontSize: 40 }} />
            </Box> */}
            <FormLabel>Picture</FormLabel>
            <Button
                sx={{
                    width: '100%',
                    height: '400px',
                    ...(user.profilePictureUrl
                        ? {
                              backgroundImage: `url('${user.profilePictureUrl}')`,
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: 'cover'
                          }
                        : {})
                }}
            >
                {!user.profilePictureUrl ? <FileUploadIcon /> : <></>}
            </Button>
            <Button fullWidth variant="contained" color="primary">
                update
            </Button>
        </Box>
    )
}
