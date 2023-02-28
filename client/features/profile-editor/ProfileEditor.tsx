import { Alert, Box, Button, Grid, IconButton } from '@mui/material'
import TextField from '@mui/material/TextField'
import { UserContext } from 'client/context/list/user'
import React, { useState, useContext, useRef } from 'react'
import { LoadingOverlay } from 'client/ui'
import { URL as ApiUrl } from 'client/network-utils/const'
import { api } from 'client/network-utils/api'
import CircleIcon from '@mui/icons-material/Circle'
import type { Failure, Success } from 'pages/api/profile'
import { ProfilePicture } from '../profile-picture/ProfilePicture'
import randomColor from 'randomcolor'
import { WSContext } from 'client/context/list/ws'
import { deleteCookie } from 'cookies-next'
import { useGlobalModal } from '../global-modal/GlobalModal'

interface Props {
    onUpdated?: () => void
}

export const ProfileEditor: React.FC<Props> = props => {
    const globalModel = useGlobalModal()

    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useContext(UserContext)
    const ws = useContext(WSContext)

    const [nickname, setNickname] = useState(user.nickname)
    const [nicknameColor, setNicknameColor] = useState(user.nicknameColor)
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
              url: user.avatarUrl
          }

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        if (!imageFile) {
            data.delete('image')
        }

        setIsLoading(true)

        const [response, postError] = await api.post<Failure | Success>(ApiUrl.Profile, data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        user.setNickname(nickname)
        user.setNicknameColor(nicknameColor)

        if (response.avatarUrl) {
            user.setAvatarRes(response.avatarUrl)
        }

        if (props.onUpdated) {
            props.onUpdated()
        }
    }

    const handleLogout = () => {
        ws.send('Auth-Logout', {
            nickname: user.nickname
        })

        deleteCookie('token')

        window.location.reload()
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
                    <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <IconButton onClick={() => setNicknameColor(randomColor())} sx={{ mr: 2 }} size="small">
                            <CircleIcon sx={{ color: nicknameColor }} />
                        </IconButton>
                        <TextField variant="standard" label="nickname" name="nickname" value={nickname} onChange={e => setNickname(e.target.value)} fullWidth />
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
