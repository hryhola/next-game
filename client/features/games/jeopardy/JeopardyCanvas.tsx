import React, { MutableRefObject } from 'react'
import { PackPreview } from './frames/JeopardyPackPreview'
import { QuestionBoard } from './frames/JeopardyQuestionBoard'
import { QuestionContent } from './frames/JeopardyQuestionContent'
import { RoundPreview } from './frames/JeopardyRoundPreview'
import { JeopardyMedia, useJeopardy } from './JeopardyView'

type JeopardyCanvasProps = {
    isPackLoading: boolean
    Resources: MutableRefObject<JeopardyMedia>
}

export const JeopardyCanvas: React.FC<JeopardyCanvasProps> = props => {
    const jeopardy = useJeopardy()

    if (props.isPackLoading || !jeopardy.session) {
        return <></>
    }

    switch (jeopardy.session.frame.id) {
        case 'pack-preview':
            return <PackPreview {...jeopardy.session.frame} />
        case 'rounds-preview':
            return <RoundPreview {...jeopardy.session.frame} />
        case 'question-board':
            return <QuestionBoard {...jeopardy.session.frame} />
        case 'question-content':
            return <QuestionContent {...jeopardy.session.frame} Resources={props.Resources} />
        case 'none':
        default:
            return <></>
    }
}
