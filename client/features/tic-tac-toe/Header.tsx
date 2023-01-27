import { Grid } from '@mui/material'
import { useState } from 'react'
import { TTicTacToePlayer } from 'state'
import { Player } from '../player/Player'

interface HeaderProps {
    members: TTicTacToePlayer[]
    isLoading: boolean
}

const Header: React.FC<HeaderProps> = props => {
    const [isLoading, setIsLoading] = useState(true)

    return (
        <Grid container justifyContent="center">
            {isLoading ? (
                <Grid item>
                    <Player isLoading />
                </Grid>
            ) : (
                props.members.map(m => (
                    <Grid key={m.user.nickname} item>
                        <Player {...m} />
                    </Grid>
                ))
            )}
        </Grid>
    )
}

export default Header
