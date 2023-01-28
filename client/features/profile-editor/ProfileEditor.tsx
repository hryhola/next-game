import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormGroup,
    FormLabel,
    Grid,
    IconButton,
    InputAdornment,
    OutlinedInput
} from '@mui/material'
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

interface Props {
    onUpdated?: () => void
}

export const ProfileEditor: React.FC<Props> = props => {
    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useContext(UserContext)
    const ws = useContext(WSContext)

    const [isLogoutVisible, setIsLogoutVisible] = useState(false)

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
              url: user.avatarRes
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

        if (response.avatarRes) {
            user.setAvatarRes('/res/' + response.avatarRes)
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
                    <Button fullWidth size="large" variant="outlined" color="error" onClick={() => setIsLogoutVisible(true)}>
                        log out
                    </Button>
                </Grid>
                <Grid item>
                    <Button fullWidth size="large" variant="contained" color="primary" type="submit">
                        update
                    </Button>
                </Grid>
            </Grid>
            <Dialog open={isLogoutVisible} onClose={() => setIsLogoutVisible(true)}>
                <DialogTitle>Are you sure want to logout?</DialogTitle>
                <DialogContent>
                    <DialogContentText>You won&apos;t be able to login into this profile again</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsLogoutVisible(false)}>don&apos;t logout</Button>
                    <Button onClick={handleLogout} color="error" variant="outlined" autoFocus>
                        logout
                    </Button>
                </DialogActions>
            </Dialog>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
