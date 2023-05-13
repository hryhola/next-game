import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Grid, Typography } from '@mui/material'

export const FinalScore: React.FC<JeopardyState.FinalScoreFrame> = props => {
    return (
        <Grid
            sx={{ pt: 'calc(var(--playersHeaderHeight) + 10px)', paddingBottom: 7, transition: '0.5s' }}
            display="grid"
            justifyContent="center"
            alignContent="center"
            width="100vw"
        >
            <Grid sx={{ textAlign: 'center' }} item>
                <Typography align="center">winner</Typography>
                <Typography variant="h1" align="center">
                    {props.winner.userNickname}
                </Typography>
                {props.winner.userAvatarUrl ? <img src={props.winner.userAvatarUrl} alt="Winner picture" /> : <></>}
            </Grid>
        </Grid>
    )
}
