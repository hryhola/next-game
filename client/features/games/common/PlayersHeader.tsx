import { Box, Grid } from '@mui/material'
import { PlayerData } from 'state'
import { Player } from './Player'

interface HeaderProps {
    members: PlayerData[]
    isLoading: boolean
}

export const PlayersHeader: React.FC<HeaderProps> = props => {
    return (
        <Box
            sx={{
                background: 'linear-gradient(0deg, rgb(0 0 0 / 0%) 0%, #000024 100%)',
                zIndex: 2,
                pointerEvents: 'none'
            }}
            width="100vw"
            display="flex"
            justifyContent="center"
            position="fixed"
        >
            <Grid container width="auto" wrap="nowrap" overflow="auto">
                {props.isLoading ? (
                    <Grid item>
                        <Player isLoading />
                    </Grid>
                ) : (
                    props.members
                        .sort((a, b) => a.position - b.position)
                        .map(p => (
                            <Grid key={p.id} item>
                                <Player player={p} />
                            </Grid>
                        ))
                )}
            </Grid>
        </Box>
    )
}
