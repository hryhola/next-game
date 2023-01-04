import Button from '@mui/material/Button'
import { AuthContext } from 'client/context/list/auth.context'
import PersonIcon from '@mui/icons-material/Person'
import Image from 'next/image'
import { useContext } from 'react'
import { SxProps, Theme, Typography } from '@mui/material'
import { GetProps } from 'react-redux'

function ProfilePicture() {
    const auth = useContext(AuthContext)

    if (auth.profilePictureUrl) {
        return <Image src={auth.profilePictureUrl} alt="profile picture" />
    }

    return <PersonIcon sx={{ fontSize: 40 }} />
}

export const ProfilePreview: React.FC<GetProps<typeof Button>> = props => {
    const auth = useContext(AuthContext)

    return (
        <Button {...props}>
            <Typography variant="body1" textTransform="none">
                {auth.username}
            </Typography>
            <ProfilePicture />
        </Button>
    )
}
