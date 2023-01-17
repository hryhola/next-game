/* eslint-disable @next/next/no-img-element */

import { Box, Button, FormGroup, FormLabel, Grid, OutlinedInput } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user'
import React, { useState, useContext, useRef } from 'react'
import FileUploadIcon from '@mui/icons-material/FileUpload'

export const ProfileEditor = () => {
    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useContext(UserContext)

    const [nickname, setNickname] = useState(user.username)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const imagePath = imageFile ? URL.createObjectURL(imageFile) : user.profilePictureUrl

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()

        const data = new FormData(formRef.current!)

        console.log(data.get('nickname'))
        console.log(data.get('image'))
    }

    return (
        <Grid component="form" container direction="column" spacing={4} height="100%" onSubmit={handleSubmit} ref={formRef}>
            <Grid item alignSelf="center">
                <Button
                    component="label"
                    variant="outlined"
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '200px',
                        height: '200px'
                    }}
                >
                    <input type="file" name="image" accept="image/*" onChange={e => setImageFile(e.target.files![0])} hidden />
                    {imagePath ? (
                        <img alt="user avatar" width="198px" src={imagePath} />
                    ) : (
                        <>
                            <FileUploadIcon />
                            <FormLabel sx={{ fontSize: '0.8rem', mt: 1 }}>avatar</FormLabel>
                        </>
                    )}
                </Button>
            </Grid>
            <Grid item>
                <TextField label="nickname" name="nickname" value={nickname} onChange={e => setNickname(e.target.value)} fullWidth />
            </Grid>
            <Grid item sx={{ mt: 'auto', mb: 1 }}>
                <Button fullWidth size="large" variant="contained" color="primary" type="submit">
                    update
                </Button>
            </Grid>
        </Grid>
    )
}
