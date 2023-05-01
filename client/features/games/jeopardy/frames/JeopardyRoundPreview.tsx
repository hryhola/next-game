import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Grid, Typography, Zoom } from '@mui/material'

export const RoundPreview: React.FC<JeopardyState.RoundPreviewFrame> = props => {
    return (
        <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" height="var(--fullHeight)" overflow="hidden">
            <Grid item>
                <Zoom in>
                    <Typography align="center" variant="h3" color={props.isRoundName ? t => t.palette.primary.main : undefined}>
                        {props.text}
                    </Typography>
                </Zoom>
            </Grid>
        </Grid>
    )
}
