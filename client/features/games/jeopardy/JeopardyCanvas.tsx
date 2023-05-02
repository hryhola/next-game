import React from 'react'
import { PackThemesPreview } from './frames/JeopardyPackThemesPreview'
import { QuestionBoard } from './frames/JeopardyQuestionBoard'
import { RoundPreview } from './frames/JeopardyRoundPreview'
import { useJeopardy } from './JeopardyView'

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
        case 'rounds-preview':
            return <RoundPreview {...jeopardy.session.frame} />
        case 'pick-question':
            return <QuestionBoard {...jeopardy.session.frame} />
        case 'none':
        default:
            return <></>
    }
}
