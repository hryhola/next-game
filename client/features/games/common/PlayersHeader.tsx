import { Box, Grid } from '@mui/material'
import { useEffect, useRef } from 'react'
import { PlayerData } from 'state'
import { Player } from './Player'

interface HeaderProps {
    members: PlayerData[]
    highlightedPlayedIds?: string[]
    isLoading: boolean
    masterLabel?: 'role' | 'score'
}

export const PlayersHeader: React.FC<HeaderProps> = props => {
    const boxRef = useRef<HTMLElement>()

    function setPlayersHeaderHeight() {
        const header = document.getElementById('players-header')

        if (!header) return

        document.documentElement.style.setProperty('--playersHeaderHeight', header.offsetHeight + 'px')
    }

    useEffect(() => {
        setPlayersHeaderHeight()

        addEventListener('resize', setPlayersHeaderHeight)
        addEventListener('orientationchange', setPlayersHeaderHeight)
    }, [])

    useEffect(() => {
        setPlayersHeaderHeight()
    }, [boxRef.current])

    return (
        <Box
            sx={{
                background: 'linear-gradient(0deg, rgb(0 0 0 / 0%) 0%, #000024 100%)',
                zIndex: 2
            }}
            width="100%"
            display="flex"
            justifyContent="center"
            position="fixed"
            id="players-header"
            ref={boxRef}
        >
            <Grid container width="auto" wrap="nowrap" overflow="auto">
                {props.isLoading ? (
                    <Grid item>
                        <Player isLoading size="medium" />
                    </Grid>
                ) : (
                    props.members
                        .sort((a, b) => a.memberPosition - b.memberPosition)
                        .map(p => (
                            <Grid key={p.id} item>
                                <Player
                                    player={p}
                                    isHighlighted={props.highlightedPlayedIds?.includes(p.id)}
                                    size="medium"
                                    subtitle={p.playerIsMaster ? props.masterLabel : 'score'}
                                />
                            </Grid>
                        ))
                )}
            </Grid>
        </Box>
    )
}
