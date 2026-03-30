import React from 'react'
import { Grid, Typography } from 'client/ui/mui-shim'
import type { RealtimeJeopardyState } from 'shared/contracts/jeopardy'

export const FinalScore: React.FC<RealtimeJeopardyState.FinalScoreFrame> = props => {
    return (
        <Grid
            sx={{ pt: 'calc(var(--playersHeaderHeight) + 10px)', paddingBottom: 7, transition: '0.5s' }}
            display="grid"
            justifyContent="center"
            alignContent="center"
            width="100vw"
            minHeight="var(--fullHeight)"
        >
            <Grid sx={{ textAlign: 'center' }} item>
                <Typography align="center">winner</Typography>
                <Typography variant="h1" align="center">
                    🎉{props.winner.userNickname}🎉
                </Typography>
                {props.winner.userAvatarUrl ? <img src={props.winner.userAvatarUrl} alt="Winner picture" /> : <></>}
            </Grid>
        </Grid>
    )
}
