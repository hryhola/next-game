import { Box, Skeleton, SxProps, Theme, Typography } from '@mui/material'
import { useUser } from 'client/context/list'
import { useContext } from 'react'
import { AbstractPlayerData } from 'state'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'
import * as React from 'react'
import { PlayerMenu } from './PlayerMenu'
import { ClickerContext } from '../clicker/ClickerGame'
import { LobbyContext, useLobby } from 'client/context/list/lobby'

type Props = {
    size?: 'medium' | 'small'
} & (PlayerData | LoadingData)

type PlayerData = {
    player: AbstractPlayerData
    isLoading?: false
}

type LoadingData = {
    player?: AbstractPlayerData
    isLoading: true
}

export const Player: React.FC<Props> = props => {
    const user = useUser()

    const [playerMenuAnchor, setPlayerMenuAnchor] = React.useState<null | HTMLElement>(null)
    const size = props.size || 'small'

    const sx: SxProps<Theme> = {
        filter: 'none'
    }

    if (props.player?.isOnline === false) {
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
                clickable={user.nickname !== props.player.nickname}
                onClick={handleClick}
                size={sizes.width}
                maxSize={sizes.maxWidth}
                local={false}
                url={props.player.avatarUrl}
            />
            <Typography overflow="auto" display="block" variant="h6" noWrap textOverflow="unset" color={props.player.nicknameColor}>
                {props.player.nickname}
            </Typography>
            <Typography noWrap>{props.player.score}</Typography>
            <PlayerMenu playerMenuAnchor={playerMenuAnchor} isPlayerMenuOpen={isPlayerMenuOpen} handleClose={handleClose} player={props.player} />
        </>
    )
}
