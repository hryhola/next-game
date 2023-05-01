import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Grid, Typography } from '@mui/material'

export const PackThemesPreview: React.FC<JeopardyState.PackThemesPreviewFrame> = props => {
    return (
        <Grid display="flex" width="100vw" height="100vh" justifyContent="center" alignItems="center">
            <Grid item>
                {props.themes.map(t => (
                    <Typography align="center" variant="h2">
                        {t}
                    </Typography>
                ))}
            </Grid>
        </Grid>
    )
}
