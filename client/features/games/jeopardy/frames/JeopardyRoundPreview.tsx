import React from 'react'
import { Grid, Typography, Zoom } from 'client/ui/mui-shim'
import type { RealtimeJeopardyState } from 'shared/contracts/jeopardy'

export const RoundPreview: React.FC<RealtimeJeopardyState.RoundPreviewFrame> = props => {
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
