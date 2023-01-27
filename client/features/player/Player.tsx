import { Box, Skeleton, Typography } from '@mui/material'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { TAbstractPlayer } from 'state'
import { ProfilePicture } from '../profile-picture/ProfilePicture'

type Props =
    | TAbstractPlayer
    | {
          isLoading: boolean
      }

export const Player: React.FC<Props> = props => {
    const user = useContext(UserContext)

    return (
        <Box textAlign="center" width={200} maxWidth="30vw">
            {'isLoading' in props ? (
                <>
                    <Skeleton variant="rectangular" sx={{ width: 200, maxWidth: '30vw', maxHeight: '30vw', height: 190 }} />
                    <Skeleton variant="rectangular" sx={{ width: 200, maxWidth: '30vw', height: 28, my: 1 }} />
                    <Skeleton variant="rectangular" sx={{ width: 200, maxWidth: '30vw', height: 20 }} />
                </>
            ) : (
                <>
                    <ProfilePicture size={200} maxSize="30vw" local={false} url={props.user.avatarRes} />
                    <Typography variant="h6">{props.user.nickname}</Typography>
                    <Typography>{props.score}</Typography>
                </>
            )}
        </Box>
    )
}
