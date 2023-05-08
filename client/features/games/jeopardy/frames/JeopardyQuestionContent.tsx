import { Box, Grid, LinearProgress } from '@mui/material'
import { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import React, { MutableRefObject } from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { JeopardyMedia } from '../JeopardyView'

export const QuestionContent: React.FC<
    JeopardyState.QuestionContentFrame & {
        Resources: MutableRefObject<JeopardyMedia>
    }
> = props => {
    let content!: JSX.Element

    switch (props.type) {
        case 'image': {
            content = <img src={props.Resources.current.Images[props.content.slice(1)]} alt="Question Image" />
            break
        }
        case 'video': {
            content = <video style={{ maxWidth: '100vw' }} autoPlay src={props.Resources.current.Video[props.content.slice(1)]}></video>
            break
        }
        case 'voice': {
            content = (
                <>
                    <audio autoPlay src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
                    <img src="/assets/jeopardy/audio.gif" alt="Audio question" />
                </>
            )
            break
        }
        case 'text':
        default: {
            content = <>{props.content}</>
        }
    }

    return (
        <>
            <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" height="var(--fullHeight)" overflow="hidden">
                <Grid sx={{ textAlign: 'center' }} item>
                    {content}
                </Grid>
            </Grid>
            {props.answeringStatus === 'allowed' && props.answerProgress && (
                <Box sx={{ position: 'fixed', width: '100vw', bottom: overlayedTabsToolbarHeight }}>
                    <LinearProgress variant="determinate" value={props.answerProgress} />
                </Box>
            )}
        </>
    )
}
