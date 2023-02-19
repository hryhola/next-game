import { Box, Skeleton, SxProps, Typography } from '@mui/material'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { AbstractPlayerData } from 'state'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'

type Props = (
    | AbstractPlayerData
    | {
          isLoading: true
      }
) & {
    size?: 'medium' | 'small'
}

export const Player: React.FC<Props> = props => {
    const user = useContext(UserContext)

    const size = props.size || 'small'

    const sx: SxProps = {}

    if (!('isLoading' in props) && props.isOnline === false) {
        Object.assign(sx, {
            filter: 'grayscale(100%) brightness(0.5)'
        } as SxProps)
    }

    const sizes =
        size === 'medium'
            ? {
                  width: 200 * 0.95,
                  maxWidth: '30vw'
              }
            : {
                  width: 90,
                  maxWidth: '30vw'
              }

    return (
        <Box sx={sx} textAlign="center" width={sizes.width} maxWidth={sizes.maxWidth}>
            {'isLoading' in props ? (
                <>
                    <Skeleton variant="rectangular" sx={{ ...sizes, maxHeight: sizes.maxWidth, height: sizes.width * 0.95 }} />
                    <Skeleton variant="rectangular" sx={{ ...sizes, height: sizes.width * 0.14, my: 1 }} />
                    <Skeleton variant="rectangular" sx={{ ...sizes, height: sizes.width * 0.1 }} />
                </>
            ) : (
                <>
                    <ProfilePicture size={sizes.width} maxSize={sizes.maxWidth} local={false} url={props.avatarUrl} />
                    <Typography overflow="auto" display="block" variant="h6" noWrap>
                        {props.nickname}
                    </Typography>
                    <Typography noWrap>{props.score}</Typography>
                </>
            )}
        </Box>
    )
}
