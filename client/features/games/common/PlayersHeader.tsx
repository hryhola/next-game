import { Box, Grid } from '@mui/material'
import { AbstractPlayerData } from 'state'
import { Player } from './Player'

interface HeaderProps {
    members: AbstractPlayerData[]
    isLoading: boolean
}

const PlayersHeader: React.FC<HeaderProps> = props => {
    return (
        <Box width="100vw" display="flex" justifyContent="center">
            <Grid container width="auto" wrap="nowrap" overflow="auto">
                {props.isLoading ? (
                    <Grid item>
                        <Player isLoading />
                    </Grid>
                ) : (
                    props.members.map(p => (
                        <Grid key={p.nickname} item>
                            <Player {...p} />
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    )
}

export default PlayersHeader
