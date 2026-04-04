import React, { useEffect, useRef, useState } from 'react'
import { FinalRoundBoard } from './frames/JeopardyFinalRoundBoard'
import { FinalScore } from './frames/JeopardyFinalScore'
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
    const [packFetchingTimeMs, setPackFetchingTimeMs] = useState(null as number | null)
    const firstShownFrameId = useRef('')
    const firstShownQuestionType = useRef('')
    const firstShownQuestionId = useRef('')
    const loadedPackUrlRef = useRef<string | null>(null)
    const loadingPackUrlRef = useRef<string | null>(null)
    const packLoadRequestRef = useRef(0)

    const game = useJeopardy()
    const packUrl = game.initialData?.pack?.value ?? null

    const Resources = useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    useEffect(() => {
        if (!packUrl || loadedPackUrlRef.current === packUrl || loadingPackUrlRef.current === packUrl) return

        const requestId = ++packLoadRequestRef.current
        loadingPackUrlRef.current = packUrl
        ;(async () => {
            const startTime = Date.now()

            props.setIsPackLoading(true)
            try {
                const packArchive = await fetchPack(packUrl)

                const mediaFiles = await getMediaFilesFromPack(packArchive)

                if (packLoadRequestRef.current !== requestId) {
                    return
                }

                Resources.current = mediaFiles
                loadedPackUrlRef.current = packUrl

                const endTime = Date.now()

                setPackFetchingTimeMs(endTime - startTime)
            } catch (error) {
                console.error(error)
            } finally {
                if (packLoadRequestRef.current !== requestId) {
                    return
                }

                loadingPackUrlRef.current = null
                props.setIsPackLoading(false)
            }
        })()
    }, [packUrl, props.setIsPackLoading])

    if (props.isPackLoading || !game.session) {
        return <></>
    }

    if (!firstShownFrameId.current) {
        firstShownFrameId.current = game.session.frame.id

        if (game.session.frame.id === 'question-content') {
            firstShownQuestionId.current = game.session.frame.questionId
            firstShownQuestionType.current = game.session.frame.type
        }
    }

    const useMediaTimestamp =
        firstShownFrameId.current === 'question-content' &&
        game.session.frame.id === 'question-content' &&
        (firstShownQuestionType.current === 'voice' || firstShownQuestionType.current === 'video') &&
        game.session.frame.questionId === firstShownQuestionId.current

    switch (game.session.frame.id) {
        case 'pack-preview':
            return <PackPreview {...game.session.frame} />
        case 'rounds-preview':
            return <RoundPreview {...game.session.frame} />
        case 'question-board':
            return <QuestionBoard {...game.session.frame} />
        case 'question-content':
            return (
                <QuestionContent {...game.session.frame} Resources={Resources} packFetchingTimeMs={packFetchingTimeMs!} useMediaTimestamp={useMediaTimestamp} />
            )
        case 'final-round-board':
            return <FinalRoundBoard {...game.session.frame} Resources={Resources} />
        case 'final-score':
            return <FinalScore {...game.session.frame} />
        case 'none':
        default:
            return <></>
    }
}
