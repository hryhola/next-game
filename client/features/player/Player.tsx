import { Box, Typography } from '@mui/material'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { TAbstractPlayer } from 'state'
import { ProfilePicture } from '../profile-picture/ProfilePicture'

export const Player: React.FC<TAbstractPlayer> = props => {
    const user = useContext(UserContext)

    return (
        <Box textAlign="center" width={200} maxWidth="30vw">
            <ProfilePicture size={200} maxSize="30vw" editable={user.username === props.user.nickname} local={false} url={props.user.avatarRes} />
            <Typography variant="h6">{props.user.nickname}</Typography>
            <Typography>{props.score}</Typography>
        </Box>
    )
}
