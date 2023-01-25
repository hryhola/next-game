import { Alert, Box, Button, FormGroup, FormLabel, Grid, OutlinedInput } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user'
import React, { useState, useContext, useRef } from 'react'
import { LoadingOverlay } from 'client/ui'
import { URL as ApiUrl } from 'client/network-utils/const'
import { api } from 'client/network-utils/api'

import type { Failure, Success } from 'pages/api/profile'
import { ProfilePicture } from '../profile-picture/ProfilePicture'

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

    const displayedImage = imageFile
        ? {
              local: true,
              url: URL.createObjectURL(imageFile)
          }
        : {
              local: false,
              url: user.profilePictureUrl
          }

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        const [response, postError] = await api.post<Failure | Success>(ApiUrl.Profile, data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        user.setUsername(nickname)

        if (response.avatarRes) {
            user.setProfilePictureUrl('/res/' + response.avatarRes)
        }

        if (props.onUpdated) {
            props.onUpdated()
        }
    }

    return (
        <>
            <Grid component="form" container direction="column" spacing={4} height="100%" onSubmit={handleSubmit} ref={formRef}>
                {error && (
                    <Grid item>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}
                <Grid item alignSelf="center">
                    <ProfilePicture editable {...displayedImage} onChange={file => setImageFile(file)} />
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
