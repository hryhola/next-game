import React, { useState } from 'react'
import { Box } from '@mui/material'
import { PackThemesPreview } from './frames/JeopardyPackThemesPreview'
import { useJeopardy, useJeopardyAction } from './JeopardyView'

type JeopardyCanvasProps = {
    isPackLoading: boolean
}

export const JeopardyCanvas: React.FC<JeopardyCanvasProps> = props => {
    const jeopardy = useJeopardy()

    if (props.isPackLoading || !jeopardy.session) {
        return <></>
    }

    switch (jeopardy.session.frame.id) {
        case 'pack-themes-preview':
            return <PackThemesPreview {...jeopardy.session.frame} />
        case 'none':
        default:
            return <></>
    }
}
