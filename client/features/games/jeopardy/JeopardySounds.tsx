import React from 'react'
import { useAudio, useEventHandler, useLobby } from 'client/context/list'
import type { RealtimeJeopardyQuestionType, RealtimeJeopardyState } from 'shared/contracts/jeopardy'
import { useJeopardy, useJeopardyAction } from './JeopardyView'

const BIG_APPLAUSE_SCORE_THRESHOLD = 2000

function getQuestionTypeSound(questionType: RealtimeJeopardyQuestionType | undefined): string | null {
    switch (questionType) {
        case 'forAll':
            return 'jep_question_all.mp3'
        case 'forYourself':
        case 'noRisk':
            return 'jep_question_norisk.mp3'
        case 'secret':
        case 'secretNoQuestion':
        case 'secretPublicPrice':
            return 'jep_question_secret.mp3'
        case 'stake':
            return 'jep_question_stake.mp3'
        case 'stakeAll':
            return 'jep_question_stake_all.mp3'
        default:
            return null
    }
}

function isQuestionContentFrame(frame: RealtimeJeopardyState.Frame | null | undefined): frame is RealtimeJeopardyState.QuestionContentFrame {
    return frame?.id === 'question-content'
}

function shouldPlayNoAnswerSound(previousFrame: RealtimeJeopardyState.QuestionContentFrame, nextFrame: RealtimeJeopardyState.QuestionContentFrame): boolean {
    return (
        previousFrame.questionId === nextFrame.questionId &&
        previousFrame.answeringStatus === 'allowed' &&
        nextFrame.answeringStatus === 'too-late' &&
        nextFrame.specialPhase === 'showing-answer' &&
        (nextFrame.questionType === 'simple' || nextFrame.questionType === 'custom') &&
        nextFrame.playersWhoAnswered.length === 0
    )
}

const JeopardySounds: React.FC = () => {
    const audio = useAudio()
    const lobby = useLobby()
    const game = useJeopardy()

    const audioRef = React.useRef(audio)
    const lobbyIdRef = React.useRef(lobby.lobbyId)
    const previousFrameRef = React.useRef<RealtimeJeopardyState.Frame | null>(null)
    const currentQuestionPriceRef = React.useRef<number | null>(null)

    React.useEffect(() => {
        audioRef.current = audio
    }, [audio])

    React.useEffect(() => {
        lobbyIdRef.current = lobby.lobbyId
    }, [lobby.lobbyId])

    React.useEffect(() => {
        currentQuestionPriceRef.current = isQuestionContentFrame(game.session?.frame) ? (game.session.frame.questionPrice ?? null) : null
    }, [game.session?.frame])

    useEventHandler('Game-SessionStart', data => {
        if (data.lobbyId !== lobbyIdRef.current) {
            return
        }

        audioRef.current.play('jep_game_begin.mp3')
    })

    useJeopardyAction('$RateAnswer', data => {
        if (!data.result.success) return

        if (data.payload.rating === 'approved') {
            audioRef.current.play((currentQuestionPriceRef.current || 0) >= BIG_APPLAUSE_SCORE_THRESHOLD ? 'jep_applause_big.mp3' : 'jep_applause_small.mp3')
        } else {
            audioRef.current.play('jep_answer_wrong.mp3')
        }
    })

    useJeopardyAction('$RoundPreview', data => {
        if (!data.result.success) return

        audioRef.current.play('jep_round_begin.mp3')
    })

    useJeopardyAction('$SkipFinalTheme', data => {
        if (!data.result.success) return

        audioRef.current.play('jep_final_delete.mp3')
    })

    useJeopardyAction('$SkipCategory', data => {
        if (!data.result.success) return

        audioRef.current.play('jep_final_delete.mp3')
    })

    React.useEffect(() => {
        const frame = game.session?.frame || null
        const previousFrame = previousFrameRef.current

        if (!frame) {
            previousFrameRef.current = null
            return
        }

        if (previousFrame) {
            if (frame.id === 'question-board' && previousFrame.id !== 'question-board') {
                audio.stop('jep_game_begin.mp3', { fadeMs: 350 })
            }

            if (frame.id === 'rounds-preview' && !frame.isRoundName && (previousFrame.id !== 'rounds-preview' || previousFrame.isRoundName)) {
                audio.play('jep_round_themes.mp3')
            }

            if (
                frame.id === 'final-round-board' &&
                frame.status === 'answering' &&
                (previousFrame.id !== 'final-round-board' || previousFrame.status !== 'answering')
            ) {
                audio.play('jep_final_think.mp3')
            }

            if (frame.id === 'final-score' && previousFrame.id !== 'final-score') {
                audio.play('jep_applause_final.mp3')
            }

            if (isQuestionContentFrame(frame)) {
                if (!isQuestionContentFrame(previousFrame) || previousFrame.questionId !== frame.questionId) {
                    const questionTypeSound = getQuestionTypeSound(frame.questionType)

                    if (questionTypeSound) {
                        audio.play(questionTypeSound)
                    }
                } else if (isQuestionContentFrame(previousFrame) && shouldPlayNoAnswerSound(previousFrame, frame)) {
                    audio.play('jep_question_noanswers.mp3')
                }
            }
        }

        previousFrameRef.current = frame
    }, [audio, game.session?.frame])

    return null
}

export default JeopardySounds
