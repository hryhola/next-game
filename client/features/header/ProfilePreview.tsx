import Button, { ButtonProps } from '@mui/material/Button'
import { UserContext } from 'client/context/list/user'
import PersonIcon from '@mui/icons-material/Person'
import Image from 'next/image'
import { useContext } from 'react'
import { Typography } from '@mui/material'

function ProfilePicture() {
    const user = useContext(UserContext)

    if (user.avatarRes) {
        return (
            <>
                &nbsp;
                <img
                    style={{
                        maxWidth: '40px',
                        maxHeight: '40px'
                    }}
                    src={user.avatarRes}
                    alt="profile avatar"
                />
            </>
        )
    }

    return <PersonIcon sx={{ fontSize: 40 }} />
}

export const ProfilePreview: React.FC<ButtonProps> = props => {
    const user = useContext(UserContext)

    return (
        <Button {...props}>
            <Typography variant="body1" textTransform="none">
                {user.nickname}
            </Typography>
            <ProfilePicture />
        </Button>
    )
}
