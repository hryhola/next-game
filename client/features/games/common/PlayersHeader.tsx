import { Grid } from '@mui/material'
import { AbstractPlayerData } from 'state'
import { Player } from './Player'

interface HeaderProps {
    members: AbstractPlayerData[]
    isLoading: boolean
}

const PlayersHeader: React.FC<HeaderProps> = props => {
    return (
        <Grid container justifyContent="center" gap={2}>
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
    )
}

export default PlayersHeader
