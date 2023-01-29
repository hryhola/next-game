import { Grid } from '@mui/material'
import { useState } from 'react'
import { TTicTacToePlayer } from 'state'
import { Player } from '../player/Player'

interface HeaderProps {
    members: TTicTacToePlayer[]
    isLoading: boolean
}

const Header: React.FC<HeaderProps> = props => {
    return (
        <Grid container justifyContent="center" gap={2}>
            {props.isLoading ? (
                <Grid item>
                    <Player isLoading />
                </Grid>
            ) : (
                props.members.map(p => (
                    <Grid key={p.user.nickname} item>
                        <Player {...p} />
                    </Grid>
                ))
            )}
        </Grid>
    )
}

export default Header
