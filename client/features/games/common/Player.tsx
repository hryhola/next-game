import { Box, Skeleton, SxProps, Typography } from '@mui/material'
import { UserContext } from 'client/context/list/user'
import { useContext } from 'react'
import { AbstractPlayerData } from 'state'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'
import * as React from 'react'
import { PlayerMenu } from './PlayerMenu'
import { ClickerContext } from '../clicker/ClickerGame'

type Props = {
    size?: 'medium' | 'small'
} & (
    | {
          player: AbstractPlayerData
      }
    | {
          isLoading: true
      }
)

export const Player: React.FC<Props> = props => {
    const user = useContext(UserContext)
    const gameContext = useContext(ClickerContext)

    const [playerMenuAnchor, setPlayerMenuAnchor] = React.useState<null | HTMLElement>(null)
    const size = props.size || 'small'

    const sx: SxProps = {}

    if (!('isLoading' in props) && props.player.isOnline === false) {
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

    const isPlayerMenuOpen = Boolean(playerMenuAnchor)

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setPlayerMenuAnchor(event.currentTarget)
    }
    const handleClose = () => {
        setPlayerMenuAnchor(null)
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
                    <ProfilePicture
                        clickable={user.nickname !== props.player.nickname}
                        onClick={handleClick}
                        size={sizes.width}
                        maxSize={sizes.maxWidth}
                        local={false}
                        url={props.player.avatarUrl}
                    />
                    <Typography
                        overflow="auto"
                        display="block"
                        variant="h6"
                        noWrap
                        textOverflow="unset"
                        {...(props.player.isMaster
                            ? {
                                  color: 'blueviolet'
                              }
                            : {})}
                    >
                        {props.player.nickname}
                    </Typography>
                    <Typography noWrap>{props.player.score}</Typography>
                    <PlayerMenu playerMenuAnchor={playerMenuAnchor} isPlayerMenuOpen={isPlayerMenuOpen} handleClose={handleClose} player={props.player} />
                </>
            )}
        </Box>
    )
}
