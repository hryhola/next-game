import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Box, Typography } from '@mui/material'
import styles from './JeopardyPackThemesPreview.module.scss'

export const PackThemesPreview: React.FC<JeopardyState.PackThemesPreviewFrame> = props => {
    return (
        <Box width="100vw" height="var(--fullHeight)" overflow="hidden">
            <Box className={styles.info}>
                <Typography align="center" variant="h2" width="100%">
                    {props.packName}
                </Typography>
                <Typography align="center" variant="overline" width="100%">
                    {props.author}, {props.dateCreated}
                </Typography>
            </Box>

            <Box className={styles.themes}>
                {props.themes.map((t, i) => (
                    <Typography key={i} sx={{ wordBreak: 'break-word', mb: 4 }} align="center" variant="h4" width="100%">
                        {t}
                    </Typography>
                ))}
            </Box>
        </Box>
    )
}
