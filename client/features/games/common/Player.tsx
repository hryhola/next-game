import * as React from 'react'
import { Box, Skeleton, SxProps, Theme, Typography } from '@mui/material'
import { useLobby, useUser } from 'client/context/list'
import { PlayerData } from 'state'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'
import { PlayerMenu } from './PlayerMenu'

type Props = {
    isHighlighted?: boolean
    size?: 'medium' | 'small'
    subtitle?: 'score' | 'role'
} & (PlayerProps | LoadingData)

type PlayerProps = {
    player: PlayerData
    isLoading?: false
}

type LoadingData = {
    player?: PlayerData
    isLoading: true
}

export const Player: React.FC<Props> = props => {
    const user = useUser()
    const lobby = useLobby()

    const [playerMenuAnchor, setPlayerMenuAnchor] = React.useState<null | HTMLElement>(null)
    const size = props.size || 'small'

    const sx: SxProps<Theme> = {
        filter: 'none'
    }

    if (props.player?.userIsOnline === false) {
        sx.filter = 'grayscale(100%) brightness(0.5)'
    }

    const sizes = {
        width: size === 'medium' ? 200 * 0.95 : 90,
        maxWidth: '30vw'
    }

    const isPlayerMenuOpen = Boolean(playerMenuAnchor)

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setPlayerMenuAnchor(event.currentTarget)
    }
    const handleClose = () => {
        setPlayerMenuAnchor(null)
    }

    if (props.isHighlighted) {
        sx.background = 'linear-gradient(0deg, rgba(255,255,255,0) 1%, rgba(98,255,248,0.3) 100%);'
    }

    const withBox = (children: React.ReactNode) => (
        <Box sx={sx} textAlign="center" width={sizes.width} maxWidth={sizes.maxWidth}>
            {children}
        </Box>
    )

    if (props.isLoading) {
        return withBox(
            <>
                <Skeleton variant="rectangular" sx={{ ...sizes, maxHeight: sizes.maxWidth, height: sizes.width * 0.95 }} />
                <Skeleton variant="rectangular" sx={{ ...sizes, height: sizes.width * 0.14, my: 1 }} />
                <Skeleton variant="rectangular" sx={{ ...sizes, height: sizes.width * 0.1 }} />
            </>
        )
    }

    return withBox(
        <>
            <ProfilePicture
                clickable={user.userNickname !== props.player.userNickname && lobby.myRole === 'player'}
                onClick={handleClick}
                size={sizes.width}
                maxSize={sizes.maxWidth}
                local={false}
                url={props.player.userAvatarUrl}
                color={props.player.userColor}
            />
            <Typography overflow="auto" display="block" variant="h6" noWrap textOverflow="unset" color={props.player.userColor}>
                {props.player.userNickname}
            </Typography>
            <Typography noWrap>{props.subtitle === 'role' ? (props.player.playerIsMaster ? 'Master' : 'Player') : props.player.playerScore}</Typography>
            <PlayerMenu playerMenuAnchor={playerMenuAnchor} isPlayerMenuOpen={isPlayerMenuOpen} handleClose={handleClose} player={props.player} />
        </>
    )
}
