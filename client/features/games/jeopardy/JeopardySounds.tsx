import { useAudio } from 'client/context/list'
import React from 'react'
import { useJeopardyAction } from './JeopardyView'

type Props = {}

const JeopardySounds = (props: Props) => {
    const audio = useAudio()

    useJeopardyAction('$RateAnswer', data => {
        if (!data.result.success) return

        if (data.payload.rating === 'approved') {
            audio.play('jep_applause_small.mp3')
        } else {
            audio.play('jep_answer_wrong.mp3')
        }
    })

    useJeopardyAction('$RoundPreview', data => {
        if (!data.result.success) return

        audio.play('jep_round_begin.mp3')
    })

    useJeopardyAction('$SkipFinalTheme', data => {
        if (!data.result.success) return

        audio.play('jep_final_delete.mp3')
    })

    return <></>
}

export default JeopardySounds
