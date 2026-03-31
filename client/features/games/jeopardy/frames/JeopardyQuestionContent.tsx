import { Box, Grid, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from 'client/ui/mui-shim'
import { useAudio, useLobby, useUser, useWS } from 'client/context/list'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { isCloudflareRealtimeEnabled } from 'client/network-utils/realtimeMode'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useActionSender, useJeopardy, useJeopardyAction } from '../JeopardyView'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'
import type { RealtimeJeopardySessionState, RealtimeJeopardyState } from 'shared/contracts/jeopardy'

type QuestionContentProps = RealtimeJeopardyState.QuestionContentFrame & {
    Resources: MutableRefObject<JeopardyMedia>
    packFetchingTimeMs: number
    useMediaTimestamp: boolean
}

function getTimedProgress(startedAt: string | null | undefined, endsAt: string | null | undefined, fallback: number | null, nowMs: number): number | null {
    if (!startedAt || !endsAt) {
        return fallback
    }

    const startedAtMs = new Date(startedAt).getTime()
    const endsAtMs = new Date(endsAt).getTime()

    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startedAtMs) {
        return fallback
    }

    const totalDurationMs = endsAtMs - startedAtMs
    const remainingMs = Math.max(0, endsAtMs - nowMs)

    return Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100))
}

export const QuestionContent: React.FC<QuestionContentProps> = props => {
    const user = useUser()
    const lobby = useLobby()
    const ws = useWS()
    const game = useJeopardy()
    const globalModal = useGlobalModal()
    const actionSender = useActionSender()
    const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
    const audio = useAudio()
    const sendAction = useActionSender()
    const isWorkerMode = isCloudflareRealtimeEnabled()
    const [timerNowMs, setTimerNowMs] = useState(() => Date.now())

    const answerInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
    const closeAnswerModal = useRef<{ close: (() => void) | null }>({ close: null })
    const closeVerifyModal = useRef<{ close: (() => void) | null }>({ close: null })

    function updatePlayerVolume() {
        if (!playerRef.current) return

        playerRef.current.volume = audio.volume / 100
    }

    useEffect(() => {
        updatePlayerVolume()
    }, [audio.volume])

    useEffect(() => {
        updatePlayerVolume()
    }, [])

    useEffect(() => {
        if (!props.useMediaTimestamp || typeof props.elapsedMediaTimeMs !== 'number' || !playerRef.current) {
            return
        }

        playerRef.current.currentTime = (props.packFetchingTimeMs + props.elapsedMediaTimeMs) / 1000
    }, [props.elapsedMediaTimeMs, props.packFetchingTimeMs, props.questionId, props.useMediaTimestamp])

    useEffect(() => {
        const hasLiveWorkerTimer =
            (props.answeringStatus === 'allowed' && props.answerRequestStartedAt && props.answerRequestEndsAt) ||
            (props.answeringStatus === 'answering' && props.answerGivingStartedAt && props.answerGivingEndsAt) ||
            (props.answeringStatus === 'answer-verifying' && props.answerVerifyingStartedAt && props.answerVerifyingEndsAt)

        if (!hasLiveWorkerTimer) {
            return
        }

        const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 100)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [
        props.answerGivingEndsAt,
        props.answerGivingStartedAt,
        props.answerRequestEndsAt,
        props.answerRequestStartedAt,
        props.answerVerifyingEndsAt,
        props.answerVerifyingStartedAt,
        props.answeringStatus,
        props.questionId
    ])

    useEffect(() => {
        if (props.answeringPlayerId === user.id) {
            closeAnswerModal.current.close = globalModal.confirm({
                title: 'Your answer',
                header: 'Your answer',
                actionRequired: true,
                content: <TextField multiline inputRef={answerInputRef} />,
                onConfirm: () =>
                    actionSender('$GiveAnswer', {
                        text: answerInputRef.current?.value
                    })
            })
        } else if (closeAnswerModal.current.close) {
            closeAnswerModal.current.close()
        }
    }, [props.answeringPlayerId])

    function showVerifyModal(data: {
        currentAnsweringPlayerId: string | null
        currentAnsweringPlayerAnswerText?: string | null
        correctAnswers?: string[] | null
        incorrectAnswers?: string[] | null
    }) {
        const correctAnswers = data.correctAnswers || []
        const incorrectAnswers = data.incorrectAnswers || []

        const mostAnswersList: string[] = correctAnswers.length > incorrectAnswers.length ? correctAnswers : incorrectAnswers

        closeVerifyModal.current.close = globalModal.confirm({
            title: 'Verify answer',
            header: 'Verify answer',
            actionRequired: true,
            inContainer: false,
            content: (
                <Box>
                    <Typography sx={{ pt: 2, pb: 3, pl: 2, pr: 2 }}>
                        Answer: {data.currentAnsweringPlayerAnswerText ? data.currentAnsweringPlayerAnswerText : <i>no answer</i>}
                    </Typography>
                    {mostAnswersList.length ? (
                        <Table aria-label="Answers" size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Correct</TableCell>
                                    <TableCell>Wrong</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {mostAnswersList.map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ color: theme => theme.palette.success.light }}>{correctAnswers[i] ? correctAnswers[i] : ''}</TableCell>
                                        <TableCell sx={{ color: theme => theme.palette.error.light }}>
                                            {incorrectAnswers[i] ? incorrectAnswers[i] : ''}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <></>
                    )}
                </Box>
            ),
            onConfirm: () => sendAction('$RateAnswer', { rating: 'approved' }),
            onCancel: () => sendAction('$RateAnswer', { rating: 'declined' })
        })
    }

    useEffect(() => {
        const session = game.session as RealtimeJeopardySessionState

        if (session?.internal?.currentAnsweringPlayerId) {
            showVerifyModal(session.internal)
        } else if (closeVerifyModal.current.close) {
            closeVerifyModal.current.close()
            closeVerifyModal.current.close = null
        }
    }, [(game.session as RealtimeJeopardySessionState)?.internal?.currentAnsweringPlayerId])

    useJeopardyAction('$Pause', data => {
        if (!data.result.success) return

        playerRef.current?.pause()
    })

    useJeopardyAction('$Resume', data => {
        if (!data.result.success) return

        playerRef.current?.play()
    })

    const handleMediaEnded = () => {
        if (!isWorkerMode) {
            return
        }

        ws.send('Game-SendAction', {
            actionName: '$MediaEnded',
            actionPayload: null,
            lobbyId: lobby.lobbyId
        })
    }

    const answerRequestProgress = getTimedProgress(props.answerRequestStartedAt, props.answerRequestEndsAt, props.answerRequestTimeLeft, timerNowMs)
    const answerGivingProgress = getTimedProgress(props.answerGivingStartedAt, props.answerGivingEndsAt, props.answerGivingTimeLeft, timerNowMs)
    const answerVerifyingProgress = getTimedProgress(props.answerVerifyingStartedAt, props.answerVerifyingEndsAt, props.answerVerifyingTimeLeft, timerNowMs)
    const progressBarPositionClassName = 'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+148px)] md:bottom-0'

    let content!: React.ReactNode

    switch (props.type) {
        case 'image': {
            content = <img src={props.Resources.current.Images[props.content.slice(1)]} alt="Question Image" />
            break
        }
        case 'video': {
            content = (
                <video
                    ref={playerRef as React.MutableRefObject<HTMLVideoElement | null>}
                    style={{ maxWidth: '100vw' }}
                    autoPlay
                    onEnded={handleMediaEnded}
                    src={props.Resources.current.Video[props.content.slice(1)]}
                ></video>
            )
            break
        }
        case 'voice': {
            content = (
                <>
                    <audio ref={playerRef} autoPlay onEnded={handleMediaEnded} src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
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
            {props.answeringStatus === 'answer-verifying' && answerVerifyingProgress !== null && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerVerifyingProgress} color="success" />
                </Box>
            )}
            {props.answeringStatus === 'answering' && answerGivingProgress !== null && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerGivingProgress} color="secondary" />
                </Box>
            )}
            {props.answeringStatus === 'allowed' && answerRequestProgress !== null && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerRequestProgress} />
                </Box>
            )}
        </>
    )
}
