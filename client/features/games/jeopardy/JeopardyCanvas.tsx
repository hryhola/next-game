import React, { useEffect, useRef } from 'react'
import { PackPreview } from './frames/JeopardyPackPreview'
import { QuestionBoard } from './frames/JeopardyQuestionBoard'
import { QuestionContent } from './frames/JeopardyQuestionContent'
import { RoundPreview } from './frames/JeopardyRoundPreview'
import { useJeopardy } from './JeopardyView'
import { fetchPack, getMediaFilesFromPack, JeopardyMedia } from './utils/jeopardyPackLoading'

type JeopardyCanvasProps = {
    isPackLoading: boolean
    setIsPackLoading: (val: boolean) => void
}

export const JeopardyCanvas: React.FC<JeopardyCanvasProps> = props => {
    const game = useJeopardy()

    const Resources = useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    useEffect(() => {
        if (!game.initialData?.pack) return
        ;(async () => {
            props.setIsPackLoading(true)

            const packArchive = await fetchPack(game.initialData.pack.value)

            Resources.current = await getMediaFilesFromPack(packArchive)

            props.setIsPackLoading(false)
        })()
    }, [game.initialData])

    if (props.isPackLoading || !game.session) {
        return <></>
    }

    switch (game.session.frame.id) {
        case 'pack-preview':
            return <PackPreview {...game.session.frame} />
        case 'rounds-preview':
            return <RoundPreview {...game.session.frame} />
        case 'question-board':
            return <QuestionBoard {...game.session.frame} />
        case 'question-content':
            return <QuestionContent {...game.session.frame} Resources={Resources} />
        case 'none':
        default:
            return <></>
    }
}
