/* eslint-disable @next/next/no-img-element */

import { Box, Button, FormGroup, FormLabel, Grid, OutlinedInput } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user'
import React, { useState, useContext } from 'react'
import FileUploadIcon from '@mui/icons-material/FileUpload'

export const ProfileEditor = () => {
    const user = useContext(UserContext)
    const [nickname, setNickname] = useState(user.username)

    return (
        <Grid component="form" container direction="column" spacing={2} height="100%">
            <Grid item>
                <TextField label="nickname" value={nickname} onChange={e => setNickname(e.target.value)} fullWidth />
            </Grid>
            <Grid item>
                <Box>
                    <FormLabel sx={{ fontSize: '1rem' }}>avatar</FormLabel>
                    <br />
                    <Button
                        variant="outlined"
                        sx={{
                            width: '200px',
                            height: '200px'
                        }}
                    >
                        {user.profilePictureUrl ? <img alt="user avatar" width="198px" src={user.profilePictureUrl} /> : <FileUploadIcon />}
                    </Button>
                </Box>
            </Grid>
            <Grid item sx={{ mt: 'auto', mb: 2 }}>
                <Button fullWidth size="large" variant="contained" color="primary">
                    update
                </Button>
            </Grid>
        </Grid>
    )
}
