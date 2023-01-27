import Button, { ButtonProps } from '@mui/material/Button'
import { UserContext } from 'client/context/list/user'
import PersonIcon from '@mui/icons-material/Person'
import Image from 'next/image'
import { useContext } from 'react'
import { Typography } from '@mui/material'

function ProfilePicture() {
    const user = useContext(UserContext)

    if (user.profilePictureUrl) {
        return (
            <>
                &nbsp;
                <Image src={user.profilePictureUrl} alt="profile avatar" width={40} height={40} className="next-img" />
            </>
        )
    }

    return <PersonIcon sx={{ fontSize: 40 }} />
}

export const ProfilePreview: React.FC<ButtonProps> = props => {
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
