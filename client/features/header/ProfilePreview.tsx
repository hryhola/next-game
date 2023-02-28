import Button, { ButtonProps } from '@mui/material/Button'
import { useUser } from 'client/context/list'
import PersonIcon from '@mui/icons-material/Person'
import { Typography } from '@mui/material'

function ProfilePicture() {
    const user = useUser()

    if (user.avatarUrl) {
        return (
            <>
                &nbsp;
                <img
                    style={{
                        maxWidth: '40px',
                        maxHeight: '40px'
                    }}
                    src={user.avatarUrl}
                    alt="profile avatar"
                />
            </>
        )
    }

    return <PersonIcon sx={{ fontSize: 40 }} />
}

export const ProfilePreview: React.FC<ButtonProps> = props => {
    const user = useUser()

    return (
        <Button {...props}>
            <Typography variant="body1" textTransform="none">
                {user.nickname}
            </Typography>
            <ProfilePicture />
        </Button>
    )
}
