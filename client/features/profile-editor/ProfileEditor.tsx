/* eslint-disable @next/next/no-img-element */

import { Alert, Box, Button, FormGroup, FormLabel, Grid, OutlinedInput } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user'
import React, { useState, useContext, useRef } from 'react'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import { LoadingOverlay } from 'client/ui'
import { URL as ApiUrl } from 'client/network-utils/const'
import { Failure, Success } from 'uWebSockets/post/profile'
import { api } from 'client/network-utils/api'
import { P } from 'pino'

interface Props {
    onUpdated?: () => void
}

export const ProfileEditor: React.FC<Props> = props => {
    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useContext(UserContext)

    const [nickname, setNickname] = useState(user.username)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const imagePath = imageFile ? URL.createObjectURL(imageFile) : user.profilePictureUrl

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        const [response, postError] = await api.post<Success | Failure>(ApiUrl.Profile, data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            console.log(response)

            setError(response.message)

            return
        }

        if (imageFile) {
            console.log('setProfilePictureUrl')
            user.setProfilePictureUrl(URL.createObjectURL(imageFile))
        }

        if (props.onUpdated) {
            console.log('onUpdated')
            props.onUpdated()
        }
    }

    const imgProps = {}

    return (
        <>
            <Grid component="form" container direction="column" spacing={4} height="100%" onSubmit={handleSubmit} ref={formRef}>
                {error && (
                    <Grid item>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}
                <Grid item alignSelf="center">
                    <Button
                        component="label"
                        variant="outlined"
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '300px',
                            height: '300px',
                            padding: 0
                        }}
                    >
                        <input type="file" name="image" accept="image/*" onChange={e => setImageFile(e.target.files![0])} hidden />
                        {imagePath ? (
                            <img alt="user avatar" src={imagePath} />
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
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
