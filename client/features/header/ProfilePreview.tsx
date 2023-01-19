import Button from '@mui/material/Button'
import { UserContext } from 'client/context/list/user'
import PersonIcon from '@mui/icons-material/Person'
import Image from 'next/image'
import { useContext } from 'react'
import { SxProps, Theme, Typography } from '@mui/material'
import { GetProps } from 'react-redux'

function ProfilePicture() {
    const user = useContext(UserContext)

    if (user.profilePictureUrl) {
        return (
            <>
                &nbsp;
                <img src={user.profilePictureUrl} width={40} alt="profile picture" />
            </>
        )
    }

    return <PersonIcon sx={{ fontSize: 40 }} />
}

export const ProfilePreview: React.FC<GetProps<typeof Button>> = props => {
    const auth = useContext(UserContext)

    return (
        <Button {...props}>
            <Typography variant="body1" textTransform="none">
                {auth.username}
            </Typography>
            <ProfilePicture />
        </Button>
    )
}
