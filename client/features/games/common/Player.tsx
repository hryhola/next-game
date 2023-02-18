import { Box, Skeleton, SxProps, Typography } from '@mui/material'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { AbstractPlayerData } from 'state'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'

type Props =
    | AbstractPlayerData
    | {
          isLoading: true
      }

export const Player: React.FC<Props> = props => {
    const user = useContext(UserContext)

    const sx: SxProps = {}

    if (!('isLoading' in props) && props.isOnline === false) {
        Object.assign(sx, {
            filter: 'grayscale(100%) brightness(0.5)'
        } as SxProps)
    }

    return (
        <Box sx={sx} textAlign="center" width={200} maxWidth="30vw">
            {'isLoading' in props ? (
                <>
                    <Skeleton variant="rectangular" sx={{ width: 200, maxWidth: '30vw', maxHeight: '30vw', height: 190 }} />
                    <Skeleton variant="rectangular" sx={{ width: 200, maxWidth: '30vw', height: 28, my: 1 }} />
                    <Skeleton variant="rectangular" sx={{ width: 200, maxWidth: '30vw', height: 20 }} />
                </>
            ) : (
                <>
                    <ProfilePicture size={200} maxSize="30vw" local={false} url={props.avatarUrl} />
                    <Typography variant="h6">{props.nickname}</Typography>
                    <Typography>{props.score}</Typography>
                </>
            )}
        </Box>
    )
}
