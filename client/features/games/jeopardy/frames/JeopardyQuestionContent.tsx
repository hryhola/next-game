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
            const pageWidth = document.documentElement.clientWidth || document.body.clientWidth

            content = <video style={{ maxWidth: '100vw' }} autoPlay src={props.Resources.current.Video[props.content.slice(1)]}></video>
            break
        }
        case 'voice': {
            content = <audio autoPlay src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
            break
        }
        case 'text':
        default: {
            content = <>{props.content}</>
        }
    }

    return (
        <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" height="var(--fullHeight)" overflow="hidden">
            <Grid sx={{ textAlign: 'center' }} item>
                {content}
            </Grid>
        </Grid>
    )
}
