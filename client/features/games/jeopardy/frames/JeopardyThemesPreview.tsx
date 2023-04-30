import React, { useEffect, useState } from 'react'
import { JeopardySession } from 'state/games/jeopardy/JeopardySession'
import { Box, Grid, Typography } from '@mui/material'
import { useJeopardy } from '../JeopardyView'

type JeopardyThemesPreviewProps = {
    themes: string[]
}

export const JeopardyThemesPreview: React.FC<JeopardyThemesPreviewProps> = props => {
    const jeopardy = useJeopardy()

    const [currentThemeIndex, setCurrentThemeIndex] = useState(0)

    useEffect(() => {
        setInterval(
            () => setCurrentThemeIndex(curr => (curr + 1 === props.themes.length ? 0 : ++curr)),
            (jeopardy.session!.AllThemesPreviewDuration * 1000) / props.themes.length
        )
    }, [])

    // TODO: Use autoscrollable list instead of showing themes one by one

    return (
        <Grid display="flex" width="100vw" height="100vh" justifyContent="center" alignItems="center">
            <Grid item>
                <Typography color="white" variant="h1">
                    {props.themes[currentThemeIndex]}
                </Typography>
            </Grid>
        </Grid>
    )
}
