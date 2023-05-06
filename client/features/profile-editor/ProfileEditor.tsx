import { Alert, Box, Button, Grid, IconButton } from '@mui/material'
import TextField from '@mui/material/TextField'
import { useWS, useUser } from 'client/context/list'
import React, { useState, useRef } from 'react'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import CircleIcon from '@mui/icons-material/Circle'
import { ProfilePicture } from '../profile-picture/ProfilePicture'
import randomColor from 'randomcolor'
import { deleteCookie } from 'cookies-next'
import { useGlobalModal } from '../global-modal/GlobalModal'

interface Props {
    onUpdated?: () => void
}

export const ProfileEditor: React.FC<Props> = props => {
    const globalModel = useGlobalModal()

    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useUser()
    const ws = useWS()

    const [nickname, setNickname] = useState(user.userNickname)
    const [userColor, setNicknameColor] = useState(user.userColor)
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
              url: user.userAvatarUrl
          }

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        if (!imageFile) {
            data.delete('image')
        }

        data.set('userColor', userColor)

        setIsLoading(true)

        const [response, postError] = await api.post('profile', data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        user.setNickname(nickname)
        user.setNicknameColor(userColor)

        if (response.userAvatarUrl) {
            user.setAvatarRes(response.userAvatarUrl)
        }

        if (props.onUpdated) {
            props.onUpdated()
        }
    }

    const handleLogout = () => {
        ws.send('Auth-Logout', {
            userNickname: user.userNickname
        })

        deleteCookie('token')

        window.location.reload()
    }

    return (
        <>
            <Grid component="form" container direction="column" spacing={4} minHeight="100%" onSubmit={handleSubmit} ref={formRef}>
                {error && (
                    <Grid item>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}
                <Grid item alignSelf="center">
                    <ProfilePicture editable {...displayedImage} color={userColor} onChange={file => setImageFile(file)} />
                </Grid>
                <Grid item>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <IconButton onClick={() => setNicknameColor(randomColor())} sx={{ mr: 2 }} size="small">
                            <CircleIcon sx={{ color: userColor }} />
                        </IconButton>
                        <TextField
                            variant="standard"
                            label="nickname"
                            name="userNickname"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </Grid>
                <Grid item sx={{ mt: 'auto', mb: 1 }}>
                    <Button
                        fullWidth
                        size="large"
                        variant="outlined"
                        color="error"
                        onClick={() =>
                            globalModel.confirm({
                                content: "You won't be able to login into this profile again",
                                header: 'Are you sure want to logout?',
                                onConfirm: handleLogout
                            })
                        }
                    >
                        log out
                    </Button>
                </Grid>
                <Grid item>
                    <Button fullWidth size="large" variant="contained" color="primary" type="submit">
                        update
                    </Button>
                </Grid>
            </Grid>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
